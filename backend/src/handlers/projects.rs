use actix_web::{web, HttpResponse};
use sqlx::MySqlPool;
use crate::{errors::AppError, models::{Project, ProjectPayload}};

const SELECT: &str =
    "SELECT id, name, description, budget, spent, status, start_date, end_date
     FROM projects";

pub async fn list(pool: web::Data<MySqlPool>) -> Result<HttpResponse, AppError> {
    let projects: Vec<Project> = sqlx::query_as(&format!("{} ORDER BY id DESC", SELECT))
        .fetch_all(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(projects))
}

pub async fn create(
    pool:    web::Data<MySqlPool>,
    payload: web::Json<ProjectPayload>,
) -> Result<HttpResponse, AppError> {
    let p = payload.into_inner();
    let result = sqlx::query!(
        "INSERT INTO projects (name, description, budget, spent, status, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        p.name, p.description, p.budget,
        p.spent.unwrap_or_default(),
        p.status.as_deref().unwrap_or("active"),
        p.start_date, p.end_date
    )
    .execute(pool.get_ref()).await?;

    let new_id = result.last_insert_id() as i64;
    let project: Project = sqlx::query_as(&format!("{} WHERE id = ?", SELECT))
        .bind(new_id)
        .fetch_one(pool.get_ref()).await?;
    Ok(HttpResponse::Created().json(project))
}

pub async fn update(
    pool:    web::Data<MySqlPool>,
    id:      web::Path<i64>,
    payload: web::Json<ProjectPayload>,
) -> Result<HttpResponse, AppError> {
    let p = payload.into_inner();
    sqlx::query!(
        "UPDATE projects SET name=?, description=?, budget=?, spent=?,
         status=?, start_date=?, end_date=? WHERE id=?",
        p.name, p.description, p.budget,
        p.spent.unwrap_or_default(),
        p.status.as_deref().unwrap_or("active"),
        p.start_date, p.end_date, *id
    )
    .execute(pool.get_ref()).await?;

    let project: Project = sqlx::query_as(&format!("{} WHERE id = ?", SELECT))
        .bind(*id)
        .fetch_one(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(project))
}

pub async fn delete(
    pool: web::Data<MySqlPool>,
    id:   web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    sqlx::query!("UPDATE donations SET project_id=NULL WHERE project_id=?", *id)
        .execute(pool.get_ref()).await?;
    sqlx::query!("DELETE FROM projects WHERE id = ?", *id)
        .execute(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "deleted": true })))
}
