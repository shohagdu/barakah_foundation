use actix_web::{web, HttpResponse};
use sqlx::MySqlPool;
use crate::{errors::AppError, models::{Donation, DonationPayload, SearchQuery}};

const SELECT: &str =
    "SELECT id, donor, phone, address, amount, date, type AS don_type, project_id, notes
     FROM donations";

pub async fn list(
    pool:  web::Data<MySqlPool>,
    query: web::Query<SearchQuery>,
) -> Result<HttpResponse, AppError> {
    let donations: Vec<Donation> = match &query.search {
        Some(s) => {
            let pattern = format!("%{}%", s);
            sqlx::query_as(&format!("{} WHERE donor LIKE ? OR phone LIKE ? ORDER BY date DESC, id DESC", SELECT))
                .bind(&pattern).bind(&pattern)
                .fetch_all(pool.get_ref()).await?
        }
        None => {
            sqlx::query_as(&format!("{} ORDER BY date DESC, id DESC", SELECT))
                .fetch_all(pool.get_ref()).await?
        }
    };
    Ok(HttpResponse::Ok().json(donations))
}

pub async fn create(
    pool:    web::Data<MySqlPool>,
    payload: web::Json<DonationPayload>,
) -> Result<HttpResponse, AppError> {
    let p = payload.into_inner();
    let result = sqlx::query!(
        "INSERT INTO donations (donor, phone, address, amount, date, type, project_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        p.donor, p.phone, p.address, p.amount, p.date,
        p.don_type.as_deref().unwrap_or("general"),
        p.project_id, p.notes
    )
    .execute(pool.get_ref()).await?;

    let new_id = result.last_insert_id() as i64;
    let d: Donation = sqlx::query_as(&format!("{} WHERE id = ?", SELECT))
        .bind(new_id)
        .fetch_one(pool.get_ref()).await?;
    Ok(HttpResponse::Created().json(d))
}

pub async fn update(
    pool:    web::Data<MySqlPool>,
    id:      web::Path<i64>,
    payload: web::Json<DonationPayload>,
) -> Result<HttpResponse, AppError> {
    let p = payload.into_inner();
    sqlx::query!(
        "UPDATE donations SET donor=?, phone=?, address=?, amount=?, date=?,
         type=?, project_id=?, notes=? WHERE id=?",
        p.donor, p.phone, p.address, p.amount, p.date,
        p.don_type.as_deref().unwrap_or("general"),
        p.project_id, p.notes, *id
    )
    .execute(pool.get_ref()).await?;

    let d: Donation = sqlx::query_as(&format!("{} WHERE id = ?", SELECT))
        .bind(*id)
        .fetch_one(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(d))
}

pub async fn delete(
    pool: web::Data<MySqlPool>,
    id:   web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    sqlx::query!("DELETE FROM donations WHERE id = ?", *id)
        .execute(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "deleted": true })))
}
