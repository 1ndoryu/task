use glory_backend::handlers::ApiDoc;
use utoipa::OpenApi;

fn main() -> Result<(), serde_json::Error> {
    println!("{}", serde_json::to_string_pretty(&ApiDoc::openapi())?);
    Ok(())
}
