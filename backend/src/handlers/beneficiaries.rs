use actix_web::{web, HttpResponse};
use sqlx::MySqlPool;
use crate::{errors::AppError, models::{Beneficiary, BeneficiaryPayload, SearchQuery}};

const SELECT: &str =
    "SELECT id, name, phone, address, category, status, monthly_aid, join_date, notes
     FROM beneficiaries";

pub async fn list(
    pool:  web::Data<MySqlPool>,
    query: web::Query<SearchQuery>,
) -> Result<HttpResponse, AppError> {
    let rows: Vec<Beneficiary> = match &query.search {
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
    Ok(HttpResponse::Ok().json(rows))
}

pub async fn create(
    pool:    web::Data<MySqlPool>,
    payload: web::Json<BeneficiaryPayload>,
) -> Result<HttpResponse, AppError> {
    let p = payload.into_inner();
    let result = sqlx::query!(
        "INSERT INTO beneficiaries (name, phone, address, category, status, monthly_aid, join_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        p.name, p.phone, p.address,
        p.category.as_deref().unwrap_or("food"),
        p.status.as_deref().unwrap_or("active"),
        p.monthly_aid, p.join_date, p.notes
    )
    .execute(pool.get_ref()).await?;

    let new_id = result.last_insert_id() as i64;
    let b: Beneficiary = sqlx::query_as(&format!("{} WHERE id = ?", SELECT))
        .bind(new_id)
        .fetch_one(pool.get_ref()).await?;
    Ok(HttpResponse::Created().json(b))
}

pub async fn update(
    pool:    web::Data<MySqlPool>,
    id:      web::Path<i64>,
    payload: web::Json<BeneficiaryPayload>,
) -> Result<HttpResponse, AppError> {
    let p = payload.into_inner();
    sqlx::query!(
        "UPDATE beneficiaries SET name=?, phone=?, address=?, category=?,
         status=?, monthly_aid=?, join_date=?, notes=? WHERE id=?",
        p.name, p.phone, p.address,
        p.category.as_deref().unwrap_or("food"),
        p.status.as_deref().unwrap_or("active"),
        p.monthly_aid, p.join_date, p.notes, *id
    )
    .execute(pool.get_ref()).await?;

    let b: Beneficiary = sqlx::query_as(&format!("{} WHERE id = ?", SELECT))
        .bind(*id)
        .fetch_one(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(b))
}

pub async fn delete(
    pool: web::Data<MySqlPool>,
    id:   web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    sqlx::query!("DELETE FROM beneficiaries WHERE id = ?", *id)
        .execute(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "deleted": true })))
}
