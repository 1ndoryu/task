use sqlx::PgPool;
use uuid::Uuid;

use crate::models::admin::{AdminSubscription, AdminUser, AdminUserStats};

/// Fila cruda del JOIN para el panel admin.
#[derive(sqlx::FromRow)]
pub struct AdminUserRow {
    pub id: Uuid,
    pub nombre: String,
    pub email: String,
    pub avatar: Option<String>,
    pub fecha_registro: chrono::DateTime<chrono::Utc>,
    pub plan: Option<String>,
    pub estado: Option<String>,
    pub fecha_inicio: Option<chrono::DateTime<chrono::Utc>>,
    pub fecha_expiracion: Option<chrono::DateTime<chrono::Utc>>,
    pub stripe_customer_id: Option<String>,
    pub ultimo_pago: Option<chrono::DateTime<chrono::Utc>>,
    pub cifrado_activo: bool,
    pub habitos: i64,
    pub tareas: i64,
    pub proyectos: i64,
    pub tareas_completadas: i64,
}

impl AdminUserRow {
    #[must_use]
    pub fn into_user(self) -> AdminUser {
        let plan = self.plan.clone().unwrap_or_else(|| "free".into());
        let estado = self.estado.clone().unwrap_or_else(|| "activa".into());
        let dias_restantes = match (plan.as_str(), &self.fecha_expiracion) {
            ("premium", Some(exp)) => Some((*exp - chrono::Utc::now()).num_days()),
            _ => None,
        };
        AdminUser {
            id: self.id,
            nombre: self.nombre,
            email: self.email,
            avatar: self.avatar,
            fecha_registro: self.fecha_registro,
            suscripcion: AdminSubscription {
                plan,
                estado,
                fecha_inicio: self.fecha_inicio,
                fecha_expiracion: self.fecha_expiracion,
                dias_restantes,
                stripe_customer_id: self.stripe_customer_id,
                ultimo_pago: self.ultimo_pago,
            },
            estadisticas: AdminUserStats {
                habitos: self.habitos,
                tareas: self.tareas,
                proyectos: self.proyectos,
                tareas_completadas: self.tareas_completadas,
            },
            cifrado_activo: self.cifrado_activo,
        }
    }
}

pub struct AdminRepository;

const ADMIN_USER_SELECT: &str = r#"
    SELECT u.id, u.display_name AS nombre, u.email,
           u.avatar_url AS avatar, u.created_at AS fecha_registro,
           s.plan, s.estado, s.fecha_inicio, s.fecha_expiracion,
           s.stripe_customer_id, s.ultimo_pago,
           (e.user_id IS NOT NULL) AS cifrado_activo,
           /* [H-B03-03] Joins agregados + COUNT(DISTINCT) en vez de 4
            * subconsultas correlacionadas por fila (una pasada por página).
            * [H-B03-04] deleted_at IS NULL: paridad con dashboard.rs — los
            * soft-delete no inflan los contadores. */
           COUNT(DISTINCT h.id) AS habitos,
           COUNT(DISTINCT t.id) AS tareas,
           COUNT(DISTINCT p.id) AS proyectos,
           COUNT(DISTINCT t.id) FILTER (WHERE (t.payload->>'completado')::boolean) AS tareas_completadas
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    LEFT JOIN e2e_keys e ON e.user_id = u.id
    LEFT JOIN dashboard_habits h ON h.user_id = u.id AND h.deleted_at IS NULL
    LEFT JOIN dashboard_tasks t ON t.user_id = u.id AND t.deleted_at IS NULL
    LEFT JOIN dashboard_projects p ON p.user_id = u.id AND p.deleted_at IS NULL
    GROUP BY u.id, u.display_name, u.email, u.avatar_url, u.created_at,
             s.plan, s.estado, s.fecha_inicio, s.fecha_expiracion,
             s.stripe_customer_id, s.ultimo_pago, e.user_id
"#;

impl AdminRepository {
    pub async fn list_users(
        pool: &PgPool,
        plan: &str,
        busqueda: &str,
        ordenar_por: &str,
        orden: &str,
        pagina: i64,
        por_pagina: i64,
    ) -> Result<(Vec<AdminUser>, i64), sqlx::Error> {
        let mut where_clause = String::new();
        let mut bindings: Vec<String> = Vec::new();
        let mut params: Vec<String> = Vec::new();
        let mut idx = 1;

        if plan != "todos" {
            params.push(format!("s.plan = ${idx}"));
            bindings.push(plan.to_string());
            idx += 1;
        }
        if !busqueda.is_empty() {
            params.push(format!("(u.display_name ILIKE ${idx} OR u.email ILIKE ${idx})"));
            bindings.push(format!("%{busqueda}%"));
            idx += 1;
        }
        if !params.is_empty() {
            where_clause = format!(" WHERE {}", params.join(" AND "));
        }

        let orden_columna = match ordenar_por {
            "nombre" => "u.display_name",
            "email" => "u.email",
            "plan" => "s.plan",
            _ => "u.created_at",
        };
        let orden_dir = if orden == "asc" { "ASC" } else { "DESC" };
        let limit_clause = format!(" LIMIT ${idx} OFFSET ${idx2}", idx = idx, idx2 = idx + 1);

        let sql = format!(
            "{ADMIN_USER_SELECT}{where_clause} ORDER BY {orden_columna} {orden_dir}{limit_clause}"
        );
        let mut query = sqlx::query_as::<_, AdminUserRow>(&sql);
        for b in &bindings {
            query = query.bind(b);
        }
        let offset = (pagina - 1) * por_pagina;
        query = query.bind(por_pagina).bind(offset);
        let rows = query.fetch_all(pool).await?;

        let count_sql = format!(
            "SELECT COUNT(*) FROM users u LEFT JOIN subscriptions s ON s.user_id = u.id{where_clause}"
        );
        let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql);
        for b in &bindings {
            count_query = count_query.bind(b);
        }
        let total = count_query.fetch_one(pool).await?;

        Ok((
            rows.into_iter().map(AdminUserRow::into_user).collect(),
            total,
        ))
    }

    pub async fn get_user(pool: &PgPool, user_id: Uuid) -> Result<Option<AdminUser>, sqlx::Error> {
        let sql = format!("{ADMIN_USER_SELECT} WHERE u.id = $1");
        sqlx::query_as::<_, AdminUserRow>(&sql)
            .bind(user_id)
            .fetch_optional(pool)
            .await
            .map(|row| row.map(AdminUserRow::into_user))
    }

    pub async fn stats(pool: &PgPool) -> Result<(i64, i64, i64, i64), sqlx::Error> {
        #[derive(sqlx::FromRow)]
        struct StatsRow {
            total: i64,
            premium: i64,
            trial: i64,
            free: i64,
        }
        let row = sqlx::query_as::<_, StatsRow>(
            "SELECT
                (SELECT COUNT(*) FROM users) AS total,
                (SELECT COUNT(*) FROM subscriptions WHERE plan = 'premium' AND estado = 'activa') AS premium,
                (SELECT COUNT(*) FROM subscriptions WHERE estado = 'trial') AS trial,
                (SELECT COUNT(*) FROM subscriptions WHERE plan = 'free') AS free",
        )
        .fetch_one(pool)
        .await?;
        Ok((row.total, row.premium, row.trial, row.free))
    }
}
