use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::MySqlPool;
use rust_decimal::Decimal;
use chrono::NaiveDate;
use std::collections::{HashMap, HashSet};
use crate::errors::AppError;
use crate::handlers::collections::member_collections;

#[derive(Debug, Deserialize)]
pub struct SummaryQuery {
    pub from_month: Option<String>,  // "2026-01"
    pub to_month:   Option<String>,  // "2026-12"
    pub member_id:  Option<i64>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct ByMonth {
    month: Option<String>,
    total: Decimal,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct ByMember {
    member_id:    Option<i64>,
    name:         Option<String>,
    total:        Decimal,
    paid_count:   i64,
    unpaid_count: i64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct DepositDetail {
    member_name:   Option<String>,
    deposit_month: Option<String>,
    deposit_date:  Option<NaiveDate>,
    amount:        Decimal,
    status:        Option<String>,
}

pub async fn summary(
    pool:  web::Data<MySqlPool>,
    query: web::Query<SummaryQuery>,
) -> Result<HttpResponse, AppError> {
    let db = pool.get_ref();

    // Build WHERE clauses
    let from  = query.from_month.as_deref().unwrap_or("");
    let to    = query.to_month.as_deref().unwrap_or("");
    let mid   = query.member_id;

    // ── Summary row ──────────────────────────────────────────
    let (total_collected, total_count, paid_count, unpaid_count):
        (Decimal, i64, i64, i64) = {
        let mut q = sqlx::QueryBuilder::new(
            "SELECT COALESCE(SUM(amount),0), COUNT(*),
                    COUNT(CASE WHEN status='paid'   THEN 1 END),
                    COUNT(CASE WHEN status='unpaid' THEN 1 END)
             FROM member_deposits WHERE 1=1"
        );
        if !from.is_empty() { q.push(" AND deposit_month >= "); q.push_bind(from); }
        if !to.is_empty()   { q.push(" AND deposit_month <= "); q.push_bind(to);   }
        if let Some(m) = mid { q.push(" AND member_id = "); q.push_bind(m); }
        q.build_query_as().fetch_one(db).await?
    };

    // ── By month ─────────────────────────────────────────────
    let by_month: Vec<ByMonth> = {
        let mut q = sqlx::QueryBuilder::new(
            "SELECT deposit_month AS month, COALESCE(SUM(amount),0) AS total
             FROM member_deposits WHERE 1=1"
        );
        if !from.is_empty() { q.push(" AND deposit_month >= "); q.push_bind(from); }
        if !to.is_empty()   { q.push(" AND deposit_month <= "); q.push_bind(to);   }
        if let Some(m) = mid { q.push(" AND member_id = "); q.push_bind(m); }
        q.push(" GROUP BY deposit_month ORDER BY deposit_month");
        q.build_query_as().fetch_all(db).await?
    };

    // ── By member ────────────────────────────────────────────
    let by_member: Vec<ByMember> = {
        let mut q = sqlx::QueryBuilder::new(
            "SELECT md.member_id, m.name,
                    COALESCE(SUM(md.amount),0) AS total,
                    COUNT(CASE WHEN md.status='paid'   THEN 1 END) AS paid_count,
                    COUNT(CASE WHEN md.status='unpaid' THEN 1 END) AS unpaid_count
             FROM member_deposits md
             JOIN members m ON m.id = md.member_id
             WHERE 1=1"
        );
        if !from.is_empty() { q.push(" AND md.deposit_month >= "); q.push_bind(from); }
        if !to.is_empty()   { q.push(" AND md.deposit_month <= "); q.push_bind(to);   }
        if let Some(m) = mid { q.push(" AND md.member_id = "); q.push_bind(m); }
        q.push(" GROUP BY md.member_id, m.name ORDER BY m.name");
        q.build_query_as().fetch_all(db).await?
    };

    // ── Details ──────────────────────────────────────────────
    let details: Vec<DepositDetail> = {
        let mut q = sqlx::QueryBuilder::new(
            "SELECT m.name AS member_name, md.deposit_month, md.deposit_date,
                    md.amount, md.status
             FROM member_deposits md
             JOIN members m ON m.id = md.member_id
             WHERE 1=1"
        );
        if !from.is_empty() { q.push(" AND md.deposit_month >= "); q.push_bind(from); }
        if !to.is_empty()   { q.push(" AND md.deposit_month <= "); q.push_bind(to);   }
        if let Some(m) = mid { q.push(" AND md.member_id = "); q.push_bind(m); }
        q.push(" ORDER BY md.deposit_month DESC, m.name");
        q.build_query_as().fetch_all(db).await?
    };

    let tc_f: f64 = total_collected.try_into().unwrap_or(0.0);

    Ok(HttpResponse::Ok().json(json!({
        "summary": {
            "totalCollected": tc_f,
            "totalCount":     total_count,
            "paidCount":      paid_count,
            "unpaidCount":    unpaid_count,
        },
        "byMonth":  by_month,
        "byMember": by_member,
        "details":  details,
    })))
}

// ── Member-wise report: deposits + fines in a month range ────
#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct MemberSummary {
    member_id:      i64,
    member_name:    Option<String>,
    address:        Option<String>,
    category:       Option<String>,
    deposit_total:  Decimal,
    deposit_paid:   Decimal,
    deposit_unpaid: Decimal,
    paid_months:    i64,
    unpaid_months:  i64,
    fine_total:     Decimal,
    fine_paid:      Decimal,
    fine_unpaid:    Decimal,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct DepositTx {
    member_id:     i64,
    deposit_month: Option<String>,
    deposit_date:  Option<NaiveDate>,
    amount:        Decimal,
    status:        Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct FineTx {
    member_id:   i64,
    fine_date:   NaiveDate,
    fine_amount: Decimal,
    reason:      Option<String>,
    status:      Option<String>,
}

pub async fn member_report(
    pool:  web::Data<MySqlPool>,
    query: web::Query<SummaryQuery>,
) -> Result<HttpResponse, AppError> {
    let db   = pool.get_ref();
    let from = query.from_month.as_deref().unwrap_or("1970-01");
    let to   = query.to_month.as_deref().unwrap_or("9999-12");
    // Use DATE_FORMAT('%Y-%m') so we never construct an invalid date like 2026-02-31

    // Per-member summary
    let summary: Vec<MemberSummary> = sqlx::query_as(
        "SELECT
             m.id AS member_id, m.name AS member_name, m.address, m.category,
             COALESCE(d.deposit_total,  0) AS deposit_total,
             COALESCE(d.deposit_paid,   0) AS deposit_paid,
             COALESCE(d.deposit_unpaid, 0) AS deposit_unpaid,
             COALESCE(d.paid_months,   0) AS paid_months,
             COALESCE(d.unpaid_months, 0) AS unpaid_months,
             COALESCE(f.fine_total,     0) AS fine_total,
             COALESCE(f.fine_paid,      0) AS fine_paid,
             COALESCE(f.fine_unpaid,    0) AS fine_unpaid
         FROM members m
         LEFT JOIN (
             SELECT member_id,
                    SUM(amount) AS deposit_total,
                    SUM(CASE WHEN status='paid'   THEN amount ELSE 0 END) AS deposit_paid,
                    SUM(CASE WHEN status='unpaid' THEN amount ELSE 0 END) AS deposit_unpaid,
                    COUNT(CASE WHEN status='paid'   THEN 1 END) AS paid_months,
                    COUNT(CASE WHEN status='unpaid' THEN 1 END) AS unpaid_months
             FROM member_deposits
             WHERE deposit_month BETWEEN ? AND ?
             GROUP BY member_id
         ) d ON d.member_id = m.id
         LEFT JOIN (
             SELECT member_id,
                    SUM(fine_amount) AS fine_total,
                    SUM(CASE WHEN status='paid'   THEN fine_amount ELSE 0 END) AS fine_paid,
                    SUM(CASE WHEN status='unpaid' THEN fine_amount ELSE 0 END) AS fine_unpaid
             FROM member_fines
             WHERE DATE_FORMAT(fine_date, '%Y-%m') BETWEEN ? AND ?
             GROUP BY member_id
         ) f ON f.member_id = m.id
         ORDER BY m.name"
    )
    .bind(from).bind(to)
    .bind(from).bind(to)
    .fetch_all(db).await?;

    // All deposit rows in range
    let deposits: Vec<DepositTx> = sqlx::query_as(
        "SELECT member_id, deposit_month, deposit_date, amount, status
         FROM member_deposits
         WHERE deposit_month BETWEEN ? AND ?
         ORDER BY member_id, deposit_month"
    )
    .bind(from).bind(to)
    .fetch_all(db).await?;

    // All fine rows in range
    let fines: Vec<FineTx> = sqlx::query_as(
        "SELECT member_id, fine_date, fine_amount, reason, status
         FROM member_fines
         WHERE DATE_FORMAT(fine_date, '%Y-%m') BETWEEN ? AND ?
         ORDER BY member_id, fine_date"
    )
    .bind(from).bind(to)
    .fetch_all(db).await?;

    Ok(HttpResponse::Ok().json(json!({
        "summary":  summary,
        "deposits": deposits,
        "fines":    fines,
    })))
}

// ── Unpaid: members with unpaid deposit records ──────────────
#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct UnpaidRow {
    member_id:    i64,
    member_name:  String,
    deposit_month: Option<String>,
    amount:       Decimal,
    deposit_date: Option<NaiveDate>,
}

pub async fn unpaid(pool: web::Data<MySqlPool>) -> Result<HttpResponse, AppError> {
    let rows: Vec<UnpaidRow> = sqlx::query_as(
        "SELECT md.member_id, m.name AS member_name,
                md.deposit_month, md.amount, md.deposit_date
         FROM member_deposits md
         JOIN members m ON m.id = md.member_id
         WHERE md.status = 'unpaid'
         ORDER BY md.deposit_month DESC, m.name"
    )
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(rows))
}

// ── Member-wise detail report (single member, printable) ──────
#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct MemberInfoRow {
    id:      i64,
    name:    String,
    phone:   String,
    address: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct DepositLineRow {
    deposit_month:  Option<String>,
    amount:         Decimal,
    deposit_date:   Option<NaiveDate>,
    transaction_id: Option<i64>,
    status:         Option<String>,
}

pub async fn member_wise_report(
    pool:  web::Data<MySqlPool>,
    query: web::Query<SummaryQuery>,
) -> Result<HttpResponse, AppError> {
    let db = pool.get_ref();

    let member_id = query.member_id
        .ok_or_else(|| AppError::BadRequest("member_id required".into()))?;

    let from = query.from_month.as_deref().unwrap_or("1970-01");
    let to   = query.to_month.as_deref().unwrap_or("9999-12");

    let member: MemberInfoRow = sqlx::query_as(
        "SELECT id, name, phone, address FROM members WHERE id = ?"
    )
    .bind(member_id)
    .fetch_one(db)
    .await
    .map_err(|_| AppError::NotFound("Member not found".into()))?;

    let deposits: Vec<DepositLineRow> = sqlx::query_as(
        "SELECT deposit_month, amount, deposit_date, transaction_id, status
         FROM member_deposits
         WHERE member_id = ? AND deposit_month BETWEEN ? AND ?
         ORDER BY deposit_month ASC"
    )
    .bind(member_id).bind(from).bind(to)
    .fetch_all(db)
    .await?;

    let total_paid: f64 = deposits.iter()
        .filter(|d| d.status.as_deref() == Some("paid"))
        .map(|d| d.amount.try_into().unwrap_or(0.0_f64))
        .sum();

    let total_unpaid: f64 = deposits.iter()
        .filter(|d| d.status.as_deref() != Some("paid"))
        .map(|d| d.amount.try_into().unwrap_or(0.0_f64))
        .sum();

    let collections = member_collections(pool.clone(), member_id, from, to).await?;
    let total_collections: f64 = collections.iter()
        .map(|c| c.amount.try_into().unwrap_or(0.0_f64))
        .sum();

    Ok(HttpResponse::Ok().json(json!({
        "member":           member,
        "deposits":         deposits,
        "totalPaid":        total_paid,
        "totalUnpaid":      total_unpaid,
        "collections":      collections,
        "totalCollections": total_collections,
    })))
}

// ── Member Overall Summary Report ─────────────────────────────
#[derive(Debug, sqlx::FromRow)]
struct MemberNameRow {
    id:   i64,
    name: Option<String>,
}

#[derive(Debug, sqlx::FromRow)]
struct MonthlyDepositRow {
    member_id:     i64,
    deposit_month: String,
    total:         Decimal,
}

pub async fn member_summary_report(
    pool:  web::Data<MySqlPool>,
    query: web::Query<SummaryQuery>,
) -> Result<HttpResponse, AppError> {
    let db   = pool.get_ref();
    let from = query.from_month.as_deref().unwrap_or("1970-01");
    let to   = query.to_month.as_deref().unwrap_or("9999-12");

    let members: Vec<MemberNameRow> = sqlx::query_as(
        "SELECT id, name FROM members ORDER BY name"
    ).fetch_all(db).await?;

    let deposits: Vec<MonthlyDepositRow> = sqlx::query_as(
        "SELECT member_id, deposit_month, COALESCE(SUM(amount), 0) AS total
         FROM member_deposits
         WHERE deposit_month BETWEEN ? AND ?
         GROUP BY member_id, deposit_month
         ORDER BY deposit_month"
    )
    .bind(from).bind(to)
    .fetch_all(db).await?;

    let months: Vec<String> = {
        let mut seen = HashSet::new();
        let mut v: Vec<String> = Vec::new();
        for d in &deposits {
            if seen.insert(d.deposit_month.clone()) {
                v.push(d.deposit_month.clone());
            }
        }
        v.sort();
        v
    };

    let mut lookup: HashMap<(i64, String), f64> = HashMap::new();
    for d in &deposits {
        let amt: f64 = d.total.try_into().unwrap_or(0.0);
        lookup.insert((d.member_id, d.deposit_month.clone()), amt);
    }

    let member_rows: Vec<serde_json::Value> = members.iter().map(|m| {
        let monthly: HashMap<&str, f64> = months.iter()
            .map(|mo| (mo.as_str(), *lookup.get(&(m.id, mo.clone())).unwrap_or(&0.0)))
            .collect();

        let total: f64 = months.iter()
            .map(|mo| *lookup.get(&(m.id, mo.clone())).unwrap_or(&0.0))
            .sum();

        json!({
            "memberId":   m.id,
            "memberName": m.name,
            "monthly":    monthly,
            "total":      total,
        })
    }).collect();

    let col_totals: HashMap<&str, f64> = months.iter().map(|mo| {
        let sum: f64 = members.iter()
            .map(|m| *lookup.get(&(m.id, mo.clone())).unwrap_or(&0.0))
            .sum();
        (mo.as_str(), sum)
    }).collect();

    let grand_total: f64 = col_totals.values().sum();

    Ok(HttpResponse::Ok().json(json!({
        "months":     months,
        "members":    member_rows,
        "colTotals":  col_totals,
        "grandTotal": grand_total,
    })))
}
