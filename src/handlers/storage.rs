use axum::body::Body;
use axum::extract::{Multipart, Path, Query, State};
use axum::http::{header, StatusCode};
use axum::response::Response;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;
use uuid::Uuid;

use crate::errors::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::{
    Attachment, StorageInfo, VerifySpaceRequest, VerifySpaceResponse,
};
use crate::services::StorageService;
use crate::AppState;

#[utoipa::path(
    get,
    tag = "storage",
    path = "/api/storage",
    responses((status = 200, description = "Información de almacenamiento", body = StorageInfo)),
    security(("session_cookie" = []))
)]
pub async fn storage_info(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<StorageInfo>, AppError> {
    Ok(Json(StorageService::info(&state.pool, auth.user_id).await?))
}

#[utoipa::path(
    post,
    tag = "storage",
    path = "/api/storage/verify",
    request_body = VerifySpaceRequest,
    responses((status = 200, description = "Verificación de espacio", body = VerifySpaceResponse)),
    security(("session_cookie" = []))
)]
pub async fn verify_space(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<VerifySpaceRequest>,
) -> Result<Json<VerifySpaceResponse>, AppError> {
    Ok(Json(StorageService::verify_space(&state.pool, auth.user_id, req).await?))
}

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)] // campos query en camelCase para el contrato del front
pub struct FileListQuery {
    pub entityType: Option<String>,
    pub entityId: Option<i64>,
}

#[utoipa::path(
    get,
    tag = "storage",
    path = "/api/storage/files",
    responses((status = 200, description = "Lista de adjuntos", body = Vec<Attachment>)),
    security(("session_cookie" = []))
)]
pub async fn list_files(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<FileListQuery>,
) -> Result<Json<Vec<Attachment>>, AppError> {
    Ok(Json(
        StorageService::list(
            &state.pool,
            auth.user_id,
            query.entityType.as_deref(),
            query.entityId,
        )
        .await?,
    ))
}

#[utoipa::path(
    post,
    tag = "storage",
    path = "/api/storage/files",
    responses((status = 201, description = "Adjunto subido", body = Attachment)),
    security(("session_cookie" = []))
)]
pub async fn upload_file(
    State(state): State<AppState>,
    auth: AuthUser,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<Attachment>), AppError> {
    let mut nombre: Option<String> = None;
    let mut tipo: Option<String> = None;
    let mut entity_type: Option<String> = None;
    let mut entity_id: Option<i64> = None;
    let mut bytes: Option<Vec<u8>> = None;
    let mut mime: Option<String> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|error| AppError::BadRequest(format!("Multipart inválido: {error}")))?
    {
        let name = field.name().unwrap_or_default().to_string();
        match name.as_str() {
            "file" => {
                mime = field.content_type().map(ToString::to_string);
                nombre = field.file_name().map(ToString::to_string);
                bytes = Some(
                    field
                        .bytes()
                        .await
                        .map_err(|error| AppError::BadRequest(format!("No se pudo leer el archivo: {error}")))?
                        .to_vec(),
                );
            }
            "tipo" => {
                tipo = Some(
                    field
                        .text()
                        .await
                        .map_err(|error| AppError::BadRequest(format!("Campo tipo inválido: {error}")))?,
                );
            }
            "entityType" => {
                entity_type = Some(
                    field
                        .text()
                        .await
                        .map_err(|error| AppError::BadRequest(format!("Campo entityType inválido: {error}")))?,
                );
            }
            "entityId" => {
                let text = field
                    .text()
                    .await
                    .map_err(|error| AppError::BadRequest(format!("Campo entityId inválido: {error}")))?;
                /* [H-B05-04] El campo viene pero no parsea: feedback explícito en
                 * vez de convertir silenciosamente a None (que desvinculaba el
                 * adjunto de su entidad sin avisar al cliente). */
                entity_id = Some(
                    text.trim()
                        .parse::<i64>()
                        .map_err(|_| AppError::BadRequest(format!("Campo entityId inválido: {text:?}")))?,
                );
            }
            _ => {}
        }
    }

    let bytes = bytes.ok_or_else(|| AppError::BadRequest("Falta el campo file".into()))?;
    let nombre = nombre.ok_or_else(|| AppError::BadRequest("Archivo sin nombre".into()))?;
    let tipo = tipo.unwrap_or_else(|| {
        if mime.as_deref().is_some_and(|m| m.starts_with("image/")) {
            "imagen".into()
        } else {
            "archivo".into()
        }
    });
    if !["imagen", "audio", "archivo"].contains(&tipo.as_str()) {
        return Err(AppError::Validation("tipo debe ser imagen, audio o archivo".into()));
    }
    let tamano = i64::try_from(bytes.len()).unwrap_or(i64::MAX);
    let mime = mime.unwrap_or_else(|| "application/octet-stream".into());
    // Paridad con AdjuntosService::validarTipoMime (WP): solo tipos permitidos.
    if !crate::models::mime_permitido(&mime) {
        return Err(AppError::Validation(format!(
            "Tipo de archivo no permitido ({mime})"
        )));
    }

    // Cuota y límite por archivo.
    StorageService::verify_space(
        &state.pool,
        auth.user_id,
        VerifySpaceRequest { tamano },
    )
    .await?
    .puede_subir
    .then_some(())
    .ok_or_else(|| AppError::Conflict("No tienes espacio suficiente para este archivo".into()))?;

    // Persistencia en disco bajo uploads/{user_id}/:id.
    let file_id = Uuid::new_v4();
    let dir = std::path::PathBuf::from("uploads").join(auth.user_id.to_string());
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|error| AppError::Internal(format!("No se pudo crear el directorio de subida: {error}")))?;
    let ext = std::path::Path::new(&nombre)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{e}"))
        .unwrap_or_default();
    let ruta = dir.join(format!("{file_id}{ext}"));
    tokio::fs::write(&ruta, &bytes)
        .await
        .map_err(|error| AppError::Internal(format!("No se pudo guardar el archivo: {error}")))?;

    let row = crate::repositories::StorageRepository::create(
        &state.pool,
        file_id,
        auth.user_id,
        entity_type.as_deref(),
        entity_id,
        &nombre,
        &tipo,
        &mime,
        tamano,
        &ruta.to_string_lossy(),
        None,
    )
    .await?;

    Ok((StatusCode::CREATED, Json(Attachment {
        id: row.id,
        tipo: row.tipo,
        url: format!("/api/storage/files/{}", row.id),
        nombre: row.nombre,
        tamano: row.tamano,
        fecha_subida: row.creado_en,
        thumbnail_url: None,
    })))
}

/// Descarga autenticada: la cookie de sesión viaja en el mismo origen.
pub async fn download_file(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Response, AppError> {
    let row = StorageService::get(&state.pool, auth.user_id, id).await?;
    let path = std::path::PathBuf::from(&row.ruta);
    let bytes = tokio::fs::read(&path)
        .await
        .map_err(|_| AppError::NotFound("El archivo ya no existe en disco".into()))?;

    /* [H-B05-03] El nombre viene del cliente: si se interpolaba crudo en
     * Content-Disposition, un nombre con CR/LF o `"` permitía inyección de
     * headers o panic del HeaderValue. Se sanitiza el fallback quoted-string,
     * se limita a 255 bytes y el nombre real viaja por `filename*=UTF-8''`
     * (RFC 5987) percent-encoded; el HeaderValue se construye con error
     * mapeado en vez de `.expect` (sin pánico posible). */
    let nombre_acotado = acotar_bytes(&row.nombre, 255);
    let content_disposition = format!(
        "inline; filename=\"{}\"; filename*=UTF-8''{}",
        sanitizar_nombre_disposicion(&nombre_acotado),
        codificar_rfc5987(&nombre_acotado),
    );
    let content_disposition = header::HeaderValue::from_str(&content_disposition)
        .map_err(|_| AppError::Internal("Nombre de archivo inválido para la descarga".into()))?;

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, row.mime)
        .header(header::CONTENT_DISPOSITION, content_disposition)
        .body(Body::from(bytes))
        .expect("respuesta de descarga válida"))
}

/// Recorta un string a un máximo de bytes sin partir un carácter UTF-8.
fn acotar_bytes(nombre: &str, max_bytes: usize) -> String {
    let mut resultado = String::new();
    let mut total = 0usize;
    for caracter in nombre.chars() {
        let tamano = caracter.len_utf8();
        if total + tamano > max_bytes {
            break;
        }
        resultado.push(caracter);
        total += tamano;
    }
    resultado
}

/// Sanitiza un nombre para el valor quoted-string de Content-Disposition:
/// elimina `"`, `\\`, CR, LF y cualquier carácter de control (H-B05-03).
fn sanitizar_nombre_disposicion(nombre: &str) -> String {
    nombre
        .chars()
        .filter(|caracter| !matches!(caracter, '"' | '\\' | '\r' | '\n') && !caracter.is_control())
        .collect()
}

/// Codifica RFC 5987 (filename*=UTF-8''...): percent-encode de todo byte fuera
/// de los unreserved de RFC 3986 (A-Z a-z 0-9 . _ ~ -).
fn codificar_rfc5987(nombre: &str) -> String {
    let mut resultado = String::new();
    for byte in nombre.as_bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b'~' | b'-') {
            resultado.push(char::from(*byte));
        } else {
            resultado.push_str(&format!("%{byte:02X}"));
        }
    }
    resultado
}

#[utoipa::path(
    delete,
    tag = "storage",
    path = "/api/storage/files/:id",
    responses((status = 204, description = "Adjunto eliminado")),
    security(("session_cookie" = []))
)]
pub async fn delete_file(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    StorageService::delete(&state.pool, auth.user_id, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/storage", get(storage_info))
        .route("/storage/verify", post(verify_space))
        .route("/storage/files", get(list_files).post(upload_file))
        .route("/storage/files/:id", get(download_file).delete(delete_file))
}
