use actix_web::{web, HttpResponse};
use sqlx::MySqlPool;
use serde_json::json;
use serde::Serialize;
use chrono::NaiveDate;
use rust_decimal::Decimal;
use crate::errors::AppError;

pub async fn health(pool: web::Data<MySqlPool>) -> Result<HttpResponse, AppError> {
    sqlx::query("SELECT 1").execute(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(json!({ "status": "ok", "db": "MySQL" })))
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct RecentTx {
    id:          i64,
    date:        NaiveDate,
    description: Option<String>,
    reference:   Option<String>,
    amount:      Decimal,   // total debit side (= total credit side in balanced entry)
    tx_type:     Option<String>, // 'income' | 'expense' | 'transfer'
    accounts:    Option<String>,
}

pub async fn summary(pool: web::Data<MySqlPool>) -> Result<HttpResponse, AppError> {
    let db = pool.get_ref();

    // Income  = net debit to asset/cash accounts  (money flowing IN)
    // Expense = net credit to asset/cash accounts (money flowing OUT)
    let (income, expense): (Decimal, Decimal) = sqlx::query_as(
        "SELECT
           COALESCE(SUM(CASE WHEN a.type = 'asset'
                             THEN GREATEST(tl.debit - tl.credit, 0) ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN a.type = 'asset'
                             THEN GREATEST(tl.credit - tl.debit, 0) ELSE 0 END), 0)
         FROM transaction_lines tl
         JOIN accounts a ON a.id = tl.account_id"
    ).fetch_one(db).await?;

    let (total_donations,): (Decimal,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount), 0) FROM donations"
    ).fetch_one(db).await?;

    let (total_members,):   (i64,) = sqlx::query_as("SELECT COUNT(*) FROM members").fetch_one(db).await?;
    let (active_members,):  (i64,) = sqlx::query_as("SELECT COUNT(*) FROM members WHERE status='active'").fetch_one(db).await?;
    let (total_projects,):  (i64,) = sqlx::query_as("SELECT COUNT(*) FROM projects").fetch_one(db).await?;
    let (active_projects,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM projects WHERE status='active'").fetch_one(db).await?;
    let (total_benef,):     (i64,) = sqlx::query_as("SELECT COUNT(*) FROM beneficiaries").fetch_one(db).await?;
    let (total_meetings,):  (i64,) = sqlx::query_as("SELECT COUNT(*) FROM meetings").fetch_one(db).await?;

    // Recent 5 transactions
    // amount = SUM(debit) which equals SUM(credit) in a balanced double-entry transaction
    // tx_type determined by net asset movement: debit > credit → money in → income
    let recent_tx: Vec<RecentTx> = sqlx::query_as(
        "SELECT
           t.id,
           t.txn_date AS date,
           t.description,
           t.reference,
           COALESCE(SUM(tl.debit), 0) AS amount,
           CASE
             WHEN SUM(CASE WHEN a.type = 'asset' THEN tl.debit - tl.credit ELSE 0 END) > 0
               THEN 'income'
             WHEN SUM(CASE WHEN a.type = 'asset' THEN tl.credit - tl.debit ELSE 0 END) > 0
               THEN 'expense'
             ELSE 'transfer'
           END AS tx_type,
           GROUP_CONCAT(DISTINCT a.category ORDER BY a.id SEPARATOR ', ') AS accounts
         FROM transactions t
         LEFT JOIN transaction_lines tl  ON tl.transaction_id = t.id
         LEFT JOIN accounts a            ON a.id = tl.account_id
         GROUP BY t.id, t.txn_date, t.description, t.reference
         ORDER BY t.txn_date DESC, t.id DESC
         LIMIT 5"
    ).fetch_all(db).await?;

    let income_f:    f64 = income.try_into().unwrap_or(0.0);
    let expense_f:   f64 = expense.try_into().unwrap_or(0.0);
    let donations_f: f64 = total_donations.try_into().unwrap_or(0.0);

    Ok(HttpResponse::Ok().json(json!({
        "income":         income_f,
        "expense":        expense_f,
        "balance":        income_f - expense_f,
        "totalDonations": donations_f,
        "totalMembers":   total_members,
        "activeMembers":  active_members,
        "totalProjects":  total_projects,
        "activeProjects": active_projects,
        "totalBenef":     total_benef,
        "totalMeetings":  total_meetings,
        "recentTx":       recent_tx,
    })))
}
