use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::MySqlPool;
use rust_decimal::Decimal;
use chrono::NaiveDate;
use crate::errors::AppError;
use crate::auth::get_claims;

// ── Structs ──────────────────────────────────────────────────

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CollectionEntry {
    pub id:             i64,   // collections.id — primary key for this entry
    pub member_id:      i64,
    pub member_name:    String,
    pub title:          String,
    pub title_bn:       Option<String>,
    pub amount:         Decimal,
    pub collection_date: NaiveDate,
    pub payment_method: Option<String>,
    pub account_id:     i64,
    pub account_name:   Option<String>,
    pub transaction_id: Option<i64>,
    pub notes:          Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListQuery {
    pub member_id:  Option<i64>,
    pub from_date:  Option<NaiveDate>,
    pub to_date:    Option<NaiveDate>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePayload {
    pub member_id:       i64,
    pub title:           String,           // purpose / reason
    pub title_bn:        Option<String>,
    pub amount:          Decimal,
    pub collection_date: NaiveDate,
    pub account_id:      i64,              // credit account (fund)
    pub payment_method:  Option<String>,   // "cash" | "bank" | "mobile_banking"
    pub bank_account_id: Option<i64>,
    pub notes:           Option<String>,
}

// ── LIST ─────────────────────────────────────────────────────

pub async fn list(
    pool:  web::Data<MySqlPool>,
    query: web::Query<ListQuery>,
) -> Result<HttpResponse, AppError> {
    let db = pool.get_ref();

    let mut q = sqlx::QueryBuilder::new(
        "SELECT c.id, cm.member_id, m.name AS member_name,
                c.title, c.title_bn, cm.amount, c.collection_date,
                cm.payment_method, c.account_id, a.category AS account_name,
                cm.transaction_id, cm.notes
         FROM collections c
         JOIN collection_members cm ON cm.collection_id = c.id
         JOIN members m ON m.id = cm.member_id
         LEFT JOIN accounts a ON a.id = c.account_id
         WHERE 1=1"
    );
    if let Some(mid) = query.member_id {
        q.push(" AND cm.member_id = "); q.push_bind(mid);
    }
    if let Some(fd) = query.from_date {
        q.push(" AND c.collection_date >= "); q.push_bind(fd);
    }
    if let Some(td) = query.to_date {
        q.push(" AND c.collection_date <= "); q.push_bind(td);
    }
    q.push(" ORDER BY c.collection_date DESC, c.id DESC");

    let rows: Vec<CollectionEntry> = q.build_query_as().fetch_all(db).await?;

    let total: f64 = rows.iter()
        .map(|r| r.amount.try_into().unwrap_or(0.0_f64))
        .sum();

    Ok(HttpResponse::Ok().json(json!({
        "entries":      rows,
        "total":        total,
    })))
}

// ── CREATE (member-select → amount → account → done) ─────────

pub async fn create(
    pool:    web::Data<MySqlPool>,
    req:     HttpRequest,
    payload: web::Json<CreatePayload>,
) -> Result<HttpResponse, AppError> {
    let db      = pool.get_ref();
    let user_id: i64 = get_claims(&req).map(|c| c.sub.parse().unwrap_or(0)).unwrap_or(0);

    // 1. Create the collection record (one per entry)
    let col_res = sqlx::query!(
        "INSERT INTO collections
             (title, title_bn, type, per_member_amount, target_amount,
              collected_amount, collection_date, account_id, status, created_by)
         VALUES (?, ?, 'general', ?, ?, ?, ?, ?, 'completed', ?)",
        payload.title,
        payload.title_bn,
        payload.amount,
        payload.amount,
        payload.amount,
        payload.collection_date,
        payload.account_id,
        user_id,
    )
    .execute(db)
    .await?;
    let col_id = col_res.last_insert_id() as i64;

    // 2. Determine debit account (cash or bank)
    let debit_account_id: i64 = match payload.payment_method.as_deref() {
        Some("bank") | Some("mobile_banking") => {
            sqlx::query_scalar("SELECT id FROM accounts WHERE account_code = '1002' LIMIT 1")
                .fetch_one(db).await
                .map_err(|_| AppError::BadRequest("Bank account (1002) not found".into()))?
        }
        _ => {
            sqlx::query_scalar("SELECT id FROM accounts WHERE account_code = '1001' LIMIT 1")
                .fetch_one(db).await
                .map_err(|_| AppError::BadRequest("Cash account (1001) not found".into()))?
        }
    };

    let description = format!(
        "{} — {}",
        payload.title,
        sqlx::query_scalar::<_, String>("SELECT name FROM members WHERE id = ?")
            .bind(payload.member_id)
            .fetch_optional(db).await?
            .unwrap_or_default()
    );

    // 3. Double-entry transaction
    let tx_res = sqlx::query!(
        "INSERT INTO transactions (bank_account_id, txn_date, description, created_by)
         VALUES (?, ?, ?, ?)",
        payload.bank_account_id,
        payload.collection_date,
        description,
        user_id,
    )
    .execute(db)
    .await?;
    let tx_id = tx_res.last_insert_id() as i64;

    sqlx::query!(
        "INSERT INTO transaction_lines (transaction_id, account_id, debit, credit) VALUES
         (?, ?, ?, 0),
         (?, ?, 0, ?)",
        tx_id, debit_account_id, payload.amount,
        tx_id, payload.account_id, payload.amount,
    )
    .execute(db)
    .await?;

    // 4. Create collection_members row (status=paid, immediate)
    sqlx::query!(
        "INSERT INTO collection_members
             (collection_id, member_id, amount, status, paid_date, transaction_id, payment_method, notes)
         VALUES (?, ?, ?, 'paid', ?, ?, ?, ?)",
        col_id,
        payload.member_id,
        payload.amount,
        payload.collection_date,
        tx_id,
        payload.payment_method,
        payload.notes,
    )
    .execute(db)
    .await?;

    // 5. Return the created entry
    let entry: CollectionEntry = sqlx::query_as(
        "SELECT c.id, cm.member_id, m.name AS member_name,
                c.title, c.title_bn, cm.amount, c.collection_date,
                cm.payment_method, c.account_id, a.category AS account_name,
                cm.transaction_id, cm.notes
         FROM collections c
         JOIN collection_members cm ON cm.collection_id = c.id
         JOIN members m ON m.id = cm.member_id
         LEFT JOIN accounts a ON a.id = c.account_id
         WHERE c.id = ?"
    )
    .bind(col_id)
    .fetch_one(db)
    .await?;

    Ok(HttpResponse::Created().json(entry))
}

// ── DELETE ───────────────────────────────────────────────────

pub async fn delete(
    pool: web::Data<MySqlPool>,
    id:   web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    let db = pool.get_ref();

    // Get transaction_id
    let tx_id: Option<i64> = sqlx::query_scalar(
        "SELECT transaction_id FROM collection_members WHERE collection_id = ? LIMIT 1"
    )
    .bind(*id)
    .fetch_optional(db)
    .await?
    .flatten();

    // Reverse double-entry
    if let Some(tid) = tx_id {
        sqlx::query!("DELETE FROM transaction_lines WHERE transaction_id = ?", tid)
            .execute(db).await?;
        sqlx::query!("DELETE FROM transactions WHERE id = ?", tid)
            .execute(db).await?;
    }

    sqlx::query!("DELETE FROM collection_members WHERE collection_id = ?", *id)
        .execute(db).await?;
    sqlx::query!("DELETE FROM collections WHERE id = ?", *id)
        .execute(db).await?;

    Ok(HttpResponse::Ok().json(json!({ "ok": true })))
}

// ── SUMMARY (for dashboard / member wise report) ──────────────

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CollectionLine {
    pub collection_date: NaiveDate,
    pub title:           String,
    pub title_bn:        Option<String>,
    pub amount:          Decimal,
    pub payment_method:  Option<String>,
    pub transaction_id:  Option<i64>,
}

pub async fn member_collections(
    pool:      web::Data<MySqlPool>,
    member_id: i64,
    from:      &str,
    to:        &str,
) -> Result<Vec<CollectionLine>, AppError> {
    let rows: Vec<CollectionLine> = sqlx::query_as(
        "SELECT c.collection_date, c.title, c.title_bn,
                cm.amount, cm.payment_method, cm.transaction_id
         FROM collection_members cm
         JOIN collections c ON c.id = cm.collection_id
         WHERE cm.member_id = ?
           AND DATE_FORMAT(c.collection_date, '%Y-%m') BETWEEN ? AND ?
         ORDER BY c.collection_date ASC"
    )
    .bind(member_id).bind(from).bind(to)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(rows)
}
