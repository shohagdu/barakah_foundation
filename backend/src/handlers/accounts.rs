// accounts.rs — member_deposits + transactions + transaction_lines
use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::MySqlPool;
use rust_decimal::Decimal;
use chrono::NaiveDate;
use crate::errors::AppError;

// ================================================================
// STRUCTS — SELECT query-র সাথে হুবহু মিলতে হবে
// ================================================================

// list/get query তে যা return হবে তাই এখানে
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct DepositRow {
    pub id:              i64,
    pub member_id:       Option<i64>,
    pub member_name:     Option<String>,
    pub transaction_id:  Option<i64>,
    pub bank_account_id: Option<i64>,
    pub bank_name:       Option<String>,
    pub account_number:  Option<String>,
    pub deposit_month:   Option<String>,   // "2026-03"
    pub deposit_date:    Option<NaiveDate>,
    pub amount:          Decimal,
    pub status:          Option<String>,   // paid / unpaid
    pub description:     Option<String>,
    pub reference:       Option<String>,
}

// Frontend থেকে আসা data
#[derive(Debug, Deserialize)]
pub struct DepositPayload {
    #[serde(rename = "memberId")]
    pub member_id:       i64,
    #[serde(rename = "bankAccountId")]
    pub bank_account_id: Option<i64>,
    #[serde(rename = "depositMonth")]
    pub deposit_month:   String,           // "2026-03"
    #[serde(rename = "depositDate")]
    pub deposit_date:    NaiveDate,
    pub amount:          Decimal,
    pub status:          Option<String>,
    pub description:     Option<String>,
    pub reference:       Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DepositQuery {
    pub member_id: Option<i64>,
    pub month:     Option<String>,
    pub year:      Option<String>,
    pub status:    Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct BankAccount {
    pub id:             i64,
    pub bank_name:      Option<String>,
    pub account_name:   Option<String>,
    pub account_number: Option<String>,
}

// ================================================================
// SELECT BASE — struct field নাম হুবহু মিলিয়ে লেখা
// ================================================================
const SELECT_BASE: &str = "
    SELECT
        md.id,
        md.member_id,
        m.name             AS member_name,
        md.transaction_id,
        t.bank_account_id,
        b.bank_name,
        b.account_number,
        md.deposit_month,
        md.deposit_date,
        md.amount,
        md.status,
        t.description,
        t.reference
    FROM member_deposits md
    LEFT JOIN transactions   t  ON md.transaction_id = t.id
    LEFT JOIN members        m  ON md.member_id      = m.id
    LEFT JOIN bank_accounts  b  ON t.bank_account_id = b.id
";

// ================================================================
// LIST
// ================================================================
pub async fn list(
    pool:  web::Data<MySqlPool>,
    query: web::Query<DepositQuery>,
) -> Result<HttpResponse, AppError> {
    let db = pool.get_ref();

    let mut conditions: Vec<String> = vec![];
    let mut binds: Vec<String>      = vec![];

    if let Some(ref mid) = query.member_id.map(|v| v.to_string()) {
        conditions.push("md.member_id = ?".into());
        binds.push(mid.clone());
    }
    if let Some(ref m) = query.month {
        // deposit_month format "2026-03" — year+month combined
        conditions.push("md.deposit_month LIKE ?".into());
        binds.push(format!("%-{}", m));    // যেমন "%-03" → March সব বছর
    }
    if let Some(ref y) = query.year {
        conditions.push("md.deposit_month LIKE ?".into());
        binds.push(format!("{}-%", y));    // যেমন "2026-%" → 2026 সব মাস
    }
    if let Some(ref s) = query.status {
        conditions.push("md.status = ?".into());
        binds.push(s.clone());
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "{}{} ORDER BY md.deposit_date DESC, md.id DESC",
        SELECT_BASE, where_clause
    );

    let mut q = sqlx::query_as::<_, DepositRow>(&sql);
    for b in &binds {
        q = q.bind(b);
    }

    let deposits = q.fetch_all(db).await?;

    // Summary
    let total: f64 = deposits.iter()
        .filter(|d| d.status.as_deref() == Some("paid"))
        .map(|d| f64::try_from(d.amount).unwrap_or(0.0))
        .sum();

    let pending: f64 = deposits.iter()
        .filter(|d| d.status.as_deref() != Some("paid"))
        .map(|d| f64::try_from(d.amount).unwrap_or(0.0))
        .sum();

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": deposits,
        "summary": {
            "total_paid":    total,
            "total_pending": pending,
            "count":         deposits.len()
        }
    })))
}

// ================================================================
// CREATE — Transaction সহ (double-entry)
// ================================================================
pub async fn create(
    pool:    web::Data<MySqlPool>,
    payload: web::Json<DepositPayload>,
) -> Result<HttpResponse, AppError> {
    let p   = payload.into_inner();
    let db  = pool.get_ref();

    // Member-এর fee বের করি
    let member_fee: Option<(Decimal,)> = sqlx::query_as(
        "SELECT fee FROM members WHERE id = ?"
    )
    .bind(p.member_id)
    .fetch_optional(db)
    .await?;

    let desc = p.description.clone().unwrap_or_else(|| {
        format!("মাসিক চাঁদা — Member ID {} — {}", p.member_id, p.deposit_month)
    });
    let reference = p.reference.clone().unwrap_or_else(|| {
        format!("DEP-{}-{}", p.member_id, p.deposit_month.replace("-", ""))
    });

    // ── SQL TRANSACTION শুরু ──────────────────────────────
    let mut tx = db.begin().await?;

    // 1. transactions table
    let txn_result = sqlx::query!(
        "INSERT INTO transactions (bank_account_id, txn_date, description, reference)
         VALUES (?, ?, ?, ?)",
        p.bank_account_id,
        p.deposit_date,
        desc,
        reference
    )
    .execute(&mut *tx)
    .await?;

    let txn_id = txn_result.last_insert_id() as i64;

    // 2. member_deposits table
    let dep_result = sqlx::query!(
        "INSERT INTO member_deposits
            (member_id, transaction_id, deposit_month, amount, deposit_date, status)
         VALUES (?, ?, ?, ?, ?, ?)",
        p.member_id,
        txn_id,
        p.deposit_month,
        p.amount,
        p.deposit_date,
        p.status.as_deref().unwrap_or("paid")
    )
    .execute(&mut *tx)
    .await?;

    let dep_id = dep_result.last_insert_id() as i64;

    // 3. transaction_lines — Debit: Bank, Credit: Member Fund
    // account_id 2 = Bank, account_id 3 = Member Fund
    // (আপনার chart_of_accounts অনুযায়ী পরিবর্তন করুন)
    if p.bank_account_id.is_some() {
        // Debit Bank
        sqlx::query!(
            "INSERT INTO transaction_lines (transaction_id, account_id, debit, credit)
             VALUES (?, 2, ?, 0)",
            txn_id, p.amount
        )
        .execute(&mut *tx)
        .await?;

        // Credit Member Fund
        sqlx::query!(
            "INSERT INTO transaction_lines (transaction_id, account_id, debit, credit)
             VALUES (?, 3, 0, ?)",
            txn_id, p.amount
        )
        .execute(&mut *tx)
        .await?;
    }

    // ── COMMIT ────────────────────────────────────────────
    tx.commit().await?;

    // নতুন row return করি
    let sql = format!("{} WHERE md.id = ?", SELECT_BASE);
    let row: DepositRow = sqlx::query_as(&sql)
        .bind(dep_id)
        .fetch_one(db)
        .await?;

    Ok(HttpResponse::Created().json(row))
}

// ================================================================
// UPDATE
// ================================================================
pub async fn update(
    pool:    web::Data<MySqlPool>,
    id:      web::Path<i64>,
    payload: web::Json<DepositPayload>,
) -> Result<HttpResponse, AppError> {
    let p  = payload.into_inner();
    let db = pool.get_ref();

    // transaction_id বের করি
    let txn: Option<(i64,)> = sqlx::query_as(
        "SELECT transaction_id FROM member_deposits WHERE id = ?"
    )
    .bind(*id)
    .fetch_optional(db)
    .await?;

    let mut tx = db.begin().await?;

    // member_deposits update
    sqlx::query!(
        "UPDATE member_deposits SET
            member_id=?, deposit_month=?, amount=?,
            deposit_date=?, status=?
         WHERE id=?",
        p.member_id,
        p.deposit_month,
        p.amount,
        p.deposit_date,
        p.status.as_deref().unwrap_or("paid"),
        *id
    )
    .execute(&mut *tx)
    .await?;

    // transactions update
    if let Some((txn_id,)) = txn {
        let desc = p.description.clone().unwrap_or_else(||
            format!("মাসিক চাঁদা — Member ID {} — {}", p.member_id, p.deposit_month)
        );
        sqlx::query!(
            "UPDATE transactions SET
                bank_account_id=?, txn_date=?, description=?
             WHERE id=?",
            p.bank_account_id,
            p.deposit_date,
            desc,
            txn_id
        )
        .execute(&mut *tx)
        .await?;

        // transaction_lines amount update
        sqlx::query!(
            "UPDATE transaction_lines SET debit=?  WHERE transaction_id=? AND debit  > 0",
            p.amount, txn_id
        )
        .execute(&mut *tx)
        .await?;

        sqlx::query!(
            "UPDATE transaction_lines SET credit=? WHERE transaction_id=? AND credit > 0",
            p.amount, txn_id
        )
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    let sql = format!("{} WHERE md.id = ?", SELECT_BASE);
    let row: DepositRow = sqlx::query_as(&sql)
        .bind(*id)
        .fetch_one(db)
        .await?;

    Ok(HttpResponse::Ok().json(row))
}

// ================================================================
// DELETE — সব related row মুছবে
// ================================================================
pub async fn delete(
    pool: web::Data<MySqlPool>,
    id:   web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    let db = pool.get_ref();

    // transaction_id বের করি
    let txn: Option<(i64,)> = sqlx::query_as(
        "SELECT transaction_id FROM member_deposits WHERE id = ?"
    )
    .bind(*id)
    .fetch_optional(db)
    .await?;

    let mut tx = db.begin().await?;

    // member_deposits আগে মুছি (FK constraint)
    sqlx::query!("DELETE FROM member_deposits WHERE id = ?", *id)
        .execute(&mut *tx)
        .await?;

    // transaction_lines ও transactions মুছি
    if let Some((txn_id,)) = txn {
        sqlx::query!(
            "DELETE FROM transaction_lines WHERE transaction_id = ?", txn_id
        )
        .execute(&mut *tx)
        .await?;

        sqlx::query!(
            "DELETE FROM transactions WHERE id = ?", txn_id
        )
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({ "deleted": true })))
}

// ================================================================
// BANK ACCOUNTS LIST
// ================================================================
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

// ================================================================
// COLLECTION SUMMARY — মাস অনুযায়ী সদস্যদের চাঁদার রিপোর্ট
// ================================================================
pub async fn collection_summary(
    pool:  web::Data<MySqlPool>,
    query: web::Query<DepositQuery>,
) -> Result<HttpResponse, AppError> {
    let year = query.year.as_deref().unwrap_or("2026");

    #[derive(Debug, Serialize, sqlx::FromRow)]
    struct SummaryRow {
        member_name:   String,
        deposit_month: Option<String>,
        total:         Option<Decimal>,
        status:        Option<String>,
    }

    let rows: Vec<SummaryRow> = sqlx::query_as(
        "SELECT
            m.name          AS member_name,
            md.deposit_month,
            SUM(md.amount)  AS total,
            md.status
         FROM member_deposits md
         JOIN members m ON md.member_id = m.id
         WHERE md.deposit_month LIKE ?
         GROUP BY m.id, m.name, md.deposit_month, md.status
         ORDER BY m.name, md.deposit_month"
    )
    .bind(format!("{}-%", year))
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(rows))
}