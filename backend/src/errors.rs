use actix_web::{HttpResponse, ResponseError};
use sqlx::Error as SqlxError;
use std::fmt;

#[derive(Debug)]
pub enum AppError {
    Database(SqlxError),
    NotFound(String),
    BadRequest(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Database(e)    => write!(f, "Database error: {}", e),
            AppError::NotFound(m)    => write!(f, "Not found: {}", m),
            AppError::BadRequest(m)  => write!(f, "Bad request: {}", m),
        }
    }
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        match self {
            AppError::NotFound(m)   => HttpResponse::NotFound().json(serde_json::json!({ "error": m })),
            AppError::BadRequest(m) => HttpResponse::BadRequest().json(serde_json::json!({ "error": m })),
            AppError::Database(e)   => {
                log::error!("DB error: {:?}", e);
                HttpResponse::InternalServerError().json(serde_json::json!({ "error": "Database error" }))
            }
        }
    }
}

impl From<SqlxError> for AppError {
    fn from(e: SqlxError) -> Self {
        match &e {
            SqlxError::RowNotFound => AppError::NotFound("Record not found".into()),
            _ => AppError::Database(e),
        }
    }
}

// pub type Result<T> = std::result::Result<T, AppError>;
