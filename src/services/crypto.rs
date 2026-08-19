/* [H-B04-02] Helpers criptográficos compartidos: AuthService y SecurityService
 * ejecutan Argon2 (100-300 ms) fuera del runtime async con spawn_blocking y un
 * semáforo compartido, para no bloquear workers de tokio ni saturar CPU. */
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use std::sync::Arc;
use tokio::sync::Semaphore;

use crate::errors::AppError;

/// Hashea una contraseña/token con Argon2 en un hilo de bloqueo, acotado por el
/// semáforo de criptografía (mismo límite que AuthService).
pub async fn hash_password(
    secret: String,
    crypto_semaphore: Arc<Semaphore>,
) -> Result<String, AppError> {
    let permit = crypto_semaphore
        .acquire_owned()
        .await
        .map_err(|_| AppError::Internal("Límite de criptografía cerrado".into()))?;
    tokio::task::spawn_blocking(move || {
        let _permit = permit;
        let salt = SaltString::generate(&mut OsRng);
        Argon2::default()
            .hash_password(secret.as_bytes(), &salt)
            .map(|hash| hash.to_string())
            .map_err(|error| format!("Error al hashear: {error}"))
    })
    .await
    .map_err(|error| AppError::Internal(format!("Tarea criptográfica falló: {error}")))?
    .map_err(AppError::Internal)
}

/// Verifica un secreto contra un hash PHC almacenado, con spawn_blocking + semáforo.
pub async fn verify_password(
    secret: String,
    stored_hash: String,
    crypto_semaphore: Arc<Semaphore>,
) -> Result<bool, AppError> {
    let permit = crypto_semaphore
        .acquire_owned()
        .await
        .map_err(|_| AppError::Internal("Límite de criptografía cerrado".into()))?;
    tokio::task::spawn_blocking(move || {
        let _permit = permit;
        let parsed_hash = PasswordHash::new(&stored_hash)
            .map_err(|error| format!("Hash almacenado inválido: {error}"))?;
        Ok(Argon2::default()
            .verify_password(secret.as_bytes(), &parsed_hash)
            .is_ok())
    })
    .await
    .map_err(|error| AppError::Internal(format!("Tarea criptográfica falló: {error}")))?
    .map_err(AppError::Internal)
}
