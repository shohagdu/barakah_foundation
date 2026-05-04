use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::MySqlPool;
use rust_decimal::Decimal;
use chrono::NaiveDate;
use crate::errors::AppError;

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct FineRow {
    pub id:             i64,
    pub member_id:      Option<i64>,
    pub member_name:    Option<String>,
    pub fine_amount:    Decimal,
    pub reason:         Option<String>,
    pub status:         Option<String>,
    pub fine_date:      Option<NaiveDate>,
    pub transaction_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FineQuery {
    pub member_id: Option<i64>,
    pub status:    Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FinePayload {
    pub member_id:   i64,
    pub fine_amount: Decimal,
    pub reason:      Option<String>,
    pub fine_date:   NaiveDate,
}

pub async fn list(
    pool:  web::Data<MySqlPool>,
    query: web::Query<FineQuery>,
) -> Result<HttpResponse, AppError> {
    let db = pool.get_ref();
    let mut q = sqlx::QueryBuilder::new(
        "SELECT mf.id, mf.member_id, m.name AS member_name,
                mf.fine_amount, mf.reason, mf.status, mf.fine_date, mf.transaction_id
         FROM member_fines mf
         JOIN members m ON m.id = mf.member_id
         WHERE 1=1"
    );
    if let Some(mid) = query.member_id { q.push(" AND mf.member_id = "); q.push_bind(mid); }
    if let Some(ref s) = query.status  { q.push(" AND mf.status = ");    q.push_bind(s.clone()); }
    q.push(" ORDER BY mf.fine_date DESC, mf.id DESC");

    let rows: Vec<FineRow> = q.build_query_as().fetch_all(db).await?;
    Ok(HttpResponse::Ok().json(rows))
}

pub async fn create(
    pool:    web::Data<MySqlPool>,
    payload: web::Json<FinePayload>,
) -> Result<HttpResponse, AppError> {
    let db = pool.get_ref();
    let res = sqlx::query!(
        "INSERT INTO member_fines (member_id, fine_amount, reason, fine_date, status)
         VALUES (?, ?, ?, ?, 'unpaid')",
        payload.member_id,
        payload.fine_amount,
        payload.reason,
        payload.fine_date,
    )
    .execute(db)
    .await?;

    let fine: FineRow = sqlx::query_as(
        "SELECT mf.id, mf.member_id, m.name AS member_name,
                mf.fine_amount, mf.reason, mf.status, mf.fine_date, mf.transaction_id
         FROM member_fines mf JOIN members m ON m.id=mf.member_id WHERE mf.id=?"
    )
    .bind(res.last_insert_id() as i64)
    .fetch_one(db)
    .await?;

    Ok(HttpResponse::Created().json(fine))
}

// Mark fine paid + auto double-entry: DEBIT Bank (1002), CREDIT Late Fee Income (4002)
pub async fn pay(
    pool: web::Data<MySqlPool>,
    id:   web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    let db = pool.get_ref();

    // Load fine
    let fine: FineRow = sqlx::query_as(
        "SELECT mf.id, mf.member_id, m.name AS member_name,
                mf.fine_amount, mf.reason, mf.status, mf.fine_date, mf.transaction_id
         FROM member_fines mf JOIN members m ON m.id=mf.member_id WHERE mf.id=?"
    )
    .bind(*id)
    .fetch_one(db)
    .await
    .map_err(|_| AppError::NotFound("Fine not found".into()))?;

    if fine.status.as_deref() == Some("paid") {
        return Err(AppError::BadRequest("Already paid".into()));
    }

    // Look up account IDs by code (dynamic, not hardcoded)
    let (bank_account_id,): (i64,) = sqlx::query_as(
        "SELECT id FROM accounts WHERE account_code = '1002' LIMIT 1"
    ).fetch_one(db).await
    .map_err(|_| AppError::BadRequest("Bank account (1002) not found".into()))?;

    let (late_fee_id,): (i64,) = sqlx::query_as(
        "SELECT id FROM accounts WHERE account_code = '4002' LIMIT 1"
    ).fetch_one(db).await
    .map_err(|_| AppError::BadRequest("Late Fee Income account (4002) not found".into()))?;

    // Default bank account from bank_accounts table
    let bank_acct_id: Option<i64> = sqlx::query_scalar(
        "SELECT id FROM bank_accounts WHERE is_active=1 AND is_deleted=0 ORDER BY id LIMIT 1"
    ).fetch_optional(db).await?;

    let description = format!(
        "জরিমানা — {} ({})",
        fine.member_name.as_deref().unwrap_or("সদস্য"),
        fine.fine_date.map(|d| d.to_string()).unwrap_or_default()
    );
    let reference = format!("FINE-{}", *id);

    // Create transaction header
    let tx_res = sqlx::query!(
        "INSERT INTO transactions (bank_account_id, txn_date, description, reference)
         VALUES (?, CURDATE(), ?, ?)",
        bank_acct_id,
        description,
        reference,
    )
    .execute(db)
    .await?;
    let tx_id = tx_res.last_insert_id() as i64;

    // Debit Bank, Credit Late Fee Income
    sqlx::query!(
        "INSERT INTO transaction_lines (transaction_id, account_id, debit, credit) VALUES
         (?, ?, ?, 0),
         (?, ?, 0, ?)",
        tx_id, bank_account_id, fine.fine_amount,
        tx_id, late_fee_id,     fine.fine_amount,
    )
    .execute(db)
    .await?;

    // Mark fine as paid
    sqlx::query!(
        "UPDATE member_fines SET status='paid', transaction_id=? WHERE id=?",
        tx_id, *id
    )
    .execute(db)
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "ok":            true,
        "transactionId": tx_id,
        "amount":        fine.fine_amount,
    })))
}
