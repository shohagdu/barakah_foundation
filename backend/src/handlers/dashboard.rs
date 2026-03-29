use actix_web::{web, HttpResponse};
use sqlx::MySqlPool;
use serde_json::json;
use crate::errors::AppError;

pub async fn health(pool: web::Data<MySqlPool>) -> Result<HttpResponse, AppError> {
    sqlx::query("SELECT 1").execute(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(json!({ "status": "ok", "db": "MySQL" })))
}

pub async fn summary(pool: web::Data<MySqlPool>) -> Result<HttpResponse, AppError> {
    let db = pool.get_ref();

    let income: (rust_decimal::Decimal,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount), 0) FROM accounts WHERE type='income'"
    ).fetch_one(db).await?;

    let expense: (rust_decimal::Decimal,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount), 0) FROM accounts WHERE type='expense'"
    ).fetch_one(db).await?;

    let total_donations: (rust_decimal::Decimal,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount), 0) FROM donations"
    ).fetch_one(db).await?;

    let (total_members,): (i64,)  = sqlx::query_as("SELECT COUNT(*) FROM members").fetch_one(db).await?;
    let (active_members,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM members WHERE status='active'").fetch_one(db).await?;
    let (total_projects,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM projects").fetch_one(db).await?;
    let (active_projects,): (i64,)= sqlx::query_as("SELECT COUNT(*) FROM projects WHERE status='active'").fetch_one(db).await?;
    let (total_benef,): (i64,)    = sqlx::query_as("SELECT COUNT(*) FROM beneficiaries").fetch_one(db).await?;
    let (total_meetings,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM meetings").fetch_one(db).await?;

    // Recent 5 transactions
    let recent_tx: Vec<crate::models::Account> = sqlx::query_as(
        "SELECT id, date, type AS tx_type, category, description, amount, notes
         FROM accounts ORDER BY date DESC, id DESC LIMIT 5"
    ).fetch_all(db).await?;

    let income_f: f64  = income.0.try_into().unwrap_or(0.0);
    let expense_f: f64 = expense.0.try_into().unwrap_or(0.0);
    let donations_f: f64 = total_donations.0.try_into().unwrap_or(0.0);

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
