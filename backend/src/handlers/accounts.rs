use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::MySqlPool;
use rust_decimal::Decimal;
use chrono::NaiveDate;
use crate::errors::AppError;

// ── Structs ───────────────────────────────────────────────

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AccountRow {
    pub id:               i64,
    pub member_id:        Option<i64>,
    pub member_name:      Option<String>,
    pub bank_account_id:  Option<i64>,
    pub bank_name:        Option<String>,
    pub account_number:   Option<String>,
    pub collection_month: Option<String>,
    pub collection_year:  Option<String>,
    pub date:             NaiveDate,
    pub tx_type:          Option<String>,
    pub category:         Option<String>,
    pub description:      String,
    pub amount:           Decimal,
    pub notes:            Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AccountPayload {
    #[serde(rename = "memberId")]
    pub member_id:        Option<i64>,
    #[serde(rename = "bankAccountId")]
    pub bank_account_id:  Option<i64>,
    #[serde(rename = "collectionMonth")]
    pub collection_month: Option<String>,
    #[serde(rename = "collectionYear")]
    pub collection_year:  Option<String>,
    pub date:             NaiveDate,
    #[serde(rename = "type")]
    pub tx_type:          String,
    pub category:         Option<String>,
    pub description:      String,
    pub amount:           Decimal,
    pub notes:            Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AccountQuery {
    #[serde(rename = "type")]
    pub filter_type: Option<String>,
    pub member_id:   Option<i64>,
    pub month:       Option<String>,
    pub year:        Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct BankAccount {
    pub id:             i64,
    pub bank_name:      Option<String>,
    pub account_name:   Option<String>,
    pub account_number: Option<String>,
}

// ── SELECT base (JOIN সহ) ─────────────────────────────────

const SELECT_BASE: &str = "
    SELECT
        a.id,
        a.member_id,
        m.name          AS member_name,
        a.bank_account_id,
        b.bank_name,
        b.account_number,
        a.collection_month,
        a.collection_year,
        a.date,
        a.type          AS tx_type,
        a.category,
        a.description,
        a.amount,
        a.notes
    FROM accounts a
    LEFT JOIN members       m ON a.member_id       = m.id
    LEFT JOIN bank_accounts b ON a.bank_account_id = b.id
";

// ── LIST ─────────────────────────────────────────────────

pub async fn list(
    pool:  web::Data<MySqlPool>,
    query: web::Query<AccountQuery>,
) -> Result<HttpResponse, AppError> {
    let db = pool.get_ref();

    let mut conditions: Vec<String> = vec![];
    let mut binds: Vec<String>      = vec![];

    if let Some(ref t) = query.filter_type {
        if t != "all" {
            conditions.push("a.type = ?".into());
            binds.push(t.clone());
        }
    }
    if let Some(mid) = query.member_id {
        conditions.push("a.member_id = ?".into());
        binds.push(mid.to_string());
    }
    if let Some(ref m) = query.month {
        conditions.push("a.collection_month = ?".into());
        binds.push(m.clone());
    }
    if let Some(ref y) = query.year {
        conditions.push("a.collection_year = ?".into());
        binds.push(y.clone());
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", conditions.join(" AND "))
    };

    let sql = format!("{}{} ORDER BY a.date DESC, a.id DESC", SELECT_BASE, where_clause);

    let mut q = sqlx::query_as::<_, AccountRow>(&sql);
    for b in &binds {
        q = q.bind(b);
    }

    let accounts = q.fetch_all(db).await?;

    let income: f64 = accounts.iter()
        .filter(|a| a.tx_type.as_deref() == Some("income"))
        .map(|a| f64::try_from(a.amount).unwrap_or(0.0))
        .sum();

    let expense: f64 = accounts.iter()
        .filter(|a| a.tx_type.as_deref() == Some("expense"))
        .map(|a| f64::try_from(a.amount).unwrap_or(0.0))
        .sum();

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data":    accounts,
        "summary": {
            "income":  income,
            "expense": expense,
            "balance": income - expense
        }
    })))
}

// ── CREATE ────────────────────────────────────────────────

pub async fn create(
    pool:    web::Data<MySqlPool>,
    payload: web::Json<AccountPayload>,
) -> Result<HttpResponse, AppError> {
    let p = payload.into_inner();

    let result = sqlx::query!(
        "INSERT INTO member_deposits
            (member_id,  amount)
         VALUES (?, ?)",
        p.member_id,
        p.amount
    )
    .execute(pool.get_ref())
    .await?;

    let new_id = result.last_insert_id() as i64;
    let sql    = format!("{} WHERE a.id = ?", SELECT_BASE);

    let acc: AccountRow = sqlx::query_as(&sql)
        .bind(new_id)
        .fetch_one(pool.get_ref())
        .await?;

    Ok(HttpResponse::Created().json(acc))
}

// ── UPDATE ────────────────────────────────────────────────

pub async fn update(
    pool:    web::Data<MySqlPool>,
    id:      web::Path<i64>,
    payload: web::Json<AccountPayload>,
) -> Result<HttpResponse, AppError> {
    let p = payload.into_inner();

    sqlx::query!(
        "UPDATE member_deposits  SET
            member_id=?,
            amount=?
         WHERE id=?",
        p.member_id,
        p.amount,
        *id
    )
    .execute(pool.get_ref())
    .await?;

    let sql = format!("{} WHERE a.id = ?", SELECT_BASE);

    let acc: AccountRow = sqlx::query_as(&sql)
        .bind(*id)
        .fetch_one(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(acc))
}

// ── DELETE ────────────────────────────────────────────────

pub async fn delete(
    pool: web::Data<MySqlPool>,
    id:   web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    sqlx::query!("DELETE FROM member_deposits  WHERE id = ?", *id)
        .execute(pool.get_ref())
        .await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "deleted": true })))
}

// ── BANK ACCOUNTS ─────────────────────────────────────────

pub async fn bank_accounts(
    pool: web::Data<MySqlPool>,
) -> Result<HttpResponse, AppError> {
    let banks: Vec<BankAccount> = sqlx::query_as(
        "SELECT id, bank_name, account_name, account_number
         FROM bank_accounts ORDER BY id"
    )
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(banks))
}

// ── COLLECTION SUMMARY ────────────────────────────────────

pub async fn collection_summary(
    pool:  web::Data<MySqlPool>,
    query: web::Query<AccountQuery>,
) -> Result<HttpResponse, AppError> {
    let year = query.year.as_deref().unwrap_or("2026");

    let rows: Vec<(String, Option<String>, Option<String>, Option<Decimal>)> =
        sqlx::query_as(
            "SELECT m.name, a.collection_month, a.collection_year,
                    SUM(a.amount) AS total
             FROM accounts a
             JOIN members m ON a.member_id = m.id
             WHERE a.collection_year = ? AND a.type = 'income'
             GROUP BY m.id, m.name, a.collection_month, a.collection_year
             ORDER BY m.name, a.collection_month"
        )
        .bind(year)
        .fetch_all(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(rows))
}