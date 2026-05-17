use actix_multipart::Multipart;
use actix_web::HttpResponse;
use futures_util::TryStreamExt;
use uuid::Uuid;
use crate::errors::AppError;

const ALLOWED: &[&str] = &["jpg", "jpeg", "png", "gif", "webp", "pdf"];

pub async fn upload(mut payload: Multipart) -> Result<HttpResponse, AppError> {
    let upload_dir_str = std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "./uploads".to_string());
    let upload_dir = std::path::Path::new(&upload_dir_str);
    std::fs::create_dir_all(upload_dir)
        .map_err(|e| AppError::BadRequest(format!("Cannot create upload dir: {}", e)))?;

    while let Some(mut field) = payload.try_next().await
        .map_err(|e| AppError::BadRequest(format!("Multipart error: {}", e)))?
    {
        let orig = field.content_disposition()
            .and_then(|d| d.get_filename().map(str::to_string))
            .unwrap_or_else(|| "file".to_string());

        let ext = std::path::Path::new(&orig)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("bin")
            .to_lowercase();

        if !ALLOWED.contains(&ext.as_str()) {
            return Err(AppError::BadRequest(
                format!("File type .{} is not allowed. Allowed: jpg, png, gif, webp, pdf", ext)
            ));
        }

        let new_name = format!("{}.{}", Uuid::new_v4(), ext);
        let filepath  = upload_dir.join(&new_name);

        let mut bytes: Vec<u8> = Vec::new();
        while let Some(chunk) = field.try_next().await
            .map_err(|e| AppError::BadRequest(format!("Read error: {}", e)))?
        {
            bytes.extend_from_slice(&chunk);
        }

        std::fs::write(&filepath, &bytes)
            .map_err(|e| AppError::BadRequest(format!("Write error: {}", e)))?;

        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "path": format!("/api/uploads/{}", new_name)
        })));
    }

    Err(AppError::BadRequest("No file provided".into()))
}
