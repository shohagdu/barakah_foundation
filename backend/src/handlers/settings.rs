use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::MySqlPool;
use crate::errors::AppError;

// ── Chart of Accounts (accounts table) ──────────────────────

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ChartAccount {
    pub id:           i64,
    pub account_code: Option<String>,
    #[serde(rename = "type")]
    pub account_type: String,
    pub category:     Option<String>,
    pub description:  Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChartAccountPayload {
    pub account_code: Option<String>,
    #[serde(rename = "type")]
    pub account_type: String,
    pub category:     Option<String>,
    pub description:  Option<String>,
}

pub async fn coa_list(pool: web::Data<MySqlPool>) -> Result<HttpResponse, AppError> {
    let rows: Vec<ChartAccount> = sqlx::query_as(
        "SELECT id, account_code, type AS account_type, category, description
         FROM accounts ORDER BY created_at DESC, id DESC"
    )
    .fetch_all(pool.get_ref())
    .await?;
    Ok(HttpResponse::Ok().json(rows))
}

pub async fn coa_create(
    pool:    web::Data<MySqlPool>,
    payload: web::Json<ChartAccountPayload>,
) -> Result<HttpResponse, AppError> {
    let res = sqlx::query!(
        "INSERT INTO accounts (account_code, type, category, description)
         VALUES (?, ?, ?, ?)",
        payload.account_code,
        payload.account_type,
        payload.category,
        payload.description,
    )
    .execute(pool.get_ref())
    .await?;

    let created: ChartAccount = sqlx::query_as(
        "SELECT id, account_code, type AS account_type, category, description
         FROM accounts WHERE id = ?"
    )
    .bind(res.last_insert_id() as i64)
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(created))
}

pub async fn coa_update(
    pool:    web::Data<MySqlPool>,
    id:      web::Path<i64>,
    payload: web::Json<ChartAccountPayload>,
) -> Result<HttpResponse, AppError> {
    sqlx::query!(
        "UPDATE accounts SET account_code=?, type=?, category=?, description=? WHERE id=?",
        payload.account_code,
        payload.account_type,
        payload.category,
        payload.description,
        *id,
    )
    .execute(pool.get_ref())
    .await?;

    let updated: ChartAccount = sqlx::query_as(
        "SELECT id, account_code, type AS account_type, category, description
         FROM accounts WHERE id = ?"
    )
    .bind(*id)
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(updated))
}

pub async fn coa_delete(
    pool: web::Data<MySqlPool>,
    id:   web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    sqlx::query!("DELETE FROM accounts WHERE id = ?", *id)
        .execute(pool.get_ref())
        .await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "ok": true })))
}

// ── Bank Accounts ────────────────────────────────────────────

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct BankAccountRow {
    pub id:             i64,
    pub bank_name:      Option<String>,
    pub account_name:   Option<String>,
    pub account_number: Option<String>,
    pub branch_name:    Option<String>,
    pub routing_number: Option<String>,
    pub is_active:      bool,
    pub is_deleted:     bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BankAccountPayload {
    pub bank_name:      Option<String>,
    pub account_name:   Option<String>,
    pub account_number: Option<String>,
    pub branch_name:    Option<String>,
    pub routing_number: Option<String>,
    pub is_active:      Option<bool>,
}

pub async fn bank_list(pool: web::Data<MySqlPool>) -> Result<HttpResponse, AppError> {
    let rows: Vec<BankAccountRow> = sqlx::query_as(
        "SELECT id, bank_name, account_name, account_number,
                branch_name, routing_number, is_active, is_deleted
         FROM bank_accounts
         WHERE is_deleted = 0
         ORDER BY id"
    )
    .fetch_all(pool.get_ref())
    .await?;
    Ok(HttpResponse::Ok().json(rows))
}

pub async fn bank_create(
    pool:    web::Data<MySqlPool>,
    payload: web::Json<BankAccountPayload>,
) -> Result<HttpResponse, AppError> {
    let active = payload.is_active.unwrap_or(true);
    let res = sqlx::query!(
        "INSERT INTO bank_accounts (bank_name, account_name, account_number, branch_name, routing_number, is_active)
         VALUES (?, ?, ?, ?, ?, ?)",
        payload.bank_name,
        payload.account_name,
        payload.account_number,
        payload.branch_name,
        payload.routing_number,
        active,
    )
    .execute(pool.get_ref())
    .await?;

    let created: BankAccountRow = sqlx::query_as(
        "SELECT id, bank_name, account_name, account_number,
                branch_name, routing_number, is_active, is_deleted
         FROM bank_accounts WHERE id = ?"
    )
    .bind(res.last_insert_id() as i64)
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(created))
}

pub async fn bank_update(
    pool:    web::Data<MySqlPool>,
    id:      web::Path<i64>,
    payload: web::Json<BankAccountPayload>,
) -> Result<HttpResponse, AppError> {
    let active = payload.is_active.unwrap_or(true);
    sqlx::query!(
        "UPDATE bank_accounts
         SET bank_name=?, account_name=?, account_number=?,
             branch_name=?, routing_number=?, is_active=?
         WHERE id=? AND is_deleted=0",
        payload.bank_name,
        payload.account_name,
        payload.account_number,
        payload.branch_name,
        payload.routing_number,
        active,
        *id,
    )
    .execute(pool.get_ref())
    .await?;

    let updated: BankAccountRow = sqlx::query_as(
        "SELECT id, bank_name, account_name, account_number,
                branch_name, routing_number, is_active, is_deleted
         FROM bank_accounts WHERE id = ?"
    )
    .bind(*id)
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(updated))
}

pub async fn bank_delete(
    pool: web::Data<MySqlPool>,
    id:   web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    sqlx::query!("UPDATE bank_accounts SET is_deleted=1 WHERE id=?", *id)
        .execute(pool.get_ref())
        .await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "ok": true })))
}
