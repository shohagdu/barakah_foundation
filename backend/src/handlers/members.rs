use actix_web::{web, HttpResponse};
use sqlx::MySqlPool;
use crate::{errors::AppError, models::{Member, MemberPayload, SearchQuery}};

const SELECT: &str =
    "SELECT id, name, phone, email, address, category, status, join_date, fee, notes
     FROM members";

pub async fn list(
    pool:  web::Data<MySqlPool>,
    query: web::Query<SearchQuery>,
) -> Result<HttpResponse, AppError> {
    let members: Vec<Member> = match &query.search {
        Some(s) => {
            let pattern = format!("%{}%", s);
            sqlx::query_as(&format!("{} WHERE name LIKE ? OR phone LIKE ? ORDER BY id DESC", SELECT))
                .bind(&pattern).bind(&pattern)
                .fetch_all(pool.get_ref()).await?
        }
        None => {
            sqlx::query_as(&format!("{} ORDER BY id DESC", SELECT))
                .fetch_all(pool.get_ref()).await?
        }
    };
    Ok(HttpResponse::Ok().json(members))
}

pub async fn get_one(
    pool: web::Data<MySqlPool>,
    id:   web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    let member: Member = sqlx::query_as(&format!("{} WHERE id = ?", SELECT))
        .bind(*id)
        .fetch_one(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(member))
}

pub async fn create(
    pool:    web::Data<MySqlPool>,
    payload: web::Json<MemberPayload>,
) -> Result<HttpResponse, AppError> {
    let p = payload.into_inner();
    let result = sqlx::query!(
        "INSERT INTO members (name, phone, email, address, category, status, join_date, fee, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        p.name, p.phone, p.email, p.address,
        p.category.as_deref().unwrap_or("general"),
        p.status.as_deref().unwrap_or("active"),
        p.join_date, p.fee, p.notes
    )
    .execute(pool.get_ref()).await?;

    let new_id = result.last_insert_id() as i64;
    let member: Member = sqlx::query_as(&format!("{} WHERE id = ?", SELECT))
        .bind(new_id)
        .fetch_one(pool.get_ref()).await?;
    Ok(HttpResponse::Created().json(member))
}

pub async fn update(
    pool:    web::Data<MySqlPool>,
    id:      web::Path<i64>,
    payload: web::Json<MemberPayload>,
) -> Result<HttpResponse, AppError> {
    let p = payload.into_inner();
    sqlx::query!(
        "UPDATE members SET name=?, phone=?, email=?, address=?, category=?,
         status=?, join_date=?, fee=?, notes=? WHERE id=?",
        p.name, p.phone, p.email, p.address,
        p.category.as_deref().unwrap_or("general"),
        p.status.as_deref().unwrap_or("active"),
        p.join_date, p.fee, p.notes, *id
    )
    .execute(pool.get_ref()).await?;

    let member: Member = sqlx::query_as(&format!("{} WHERE id = ?", SELECT))
        .bind(*id)
        .fetch_one(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(member))
}

pub async fn delete(
    pool: web::Data<MySqlPool>,
    id:   web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    sqlx::query!("DELETE FROM members WHERE id = ?", *id)
        .execute(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "deleted": true, "id": *id })))
}
