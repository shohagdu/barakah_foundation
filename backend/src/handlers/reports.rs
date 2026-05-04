use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::MySqlPool;
use rust_decimal::Decimal;
use chrono::NaiveDate;
use crate::errors::AppError;

#[derive(Debug, Deserialize)]
pub struct DateRange {
    pub from: Option<NaiveDate>,
    pub to:   Option<NaiveDate>,
}

// ── Profit & Loss ─────────────────────────────────────────────
#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct PLRow {
    account_code: Option<String>,
    account_name: Option<String>,
    amount:       Decimal,
}

pub async fn profit_loss(
    pool:  web::Data<MySqlPool>,
    query: web::Query<DateRange>,
) -> Result<HttpResponse, AppError> {
    let db   = pool.get_ref();
    let from = query.from.unwrap_or(NaiveDate::from_ymd_opt(1970, 1, 1).unwrap());
    let to   = query.to.unwrap_or(NaiveDate::from_ymd_opt(9999, 12, 31).unwrap());

    // Income rows
    let income_rows: Vec<PLRow> = sqlx::query_as(
        "SELECT a.account_code, a.category AS account_name,
                COALESCE(SUM(tl.credit - tl.debit), 0) AS amount
         FROM accounts a
         LEFT JOIN transaction_lines tl ON tl.account_id = a.id
         LEFT JOIN transactions t ON t.id = tl.transaction_id
           AND t.txn_date BETWEEN ? AND ?
         WHERE a.type = 'income' AND a.status = 'approved'
         GROUP BY a.id, a.account_code, a.category
         ORDER BY a.account_code"
    )
    .bind(from).bind(to)
    .fetch_all(db).await?;

    // Expense rows
    let expense_rows: Vec<PLRow> = sqlx::query_as(
        "SELECT a.account_code, a.category AS account_name,
                COALESCE(SUM(tl.debit - tl.credit), 0) AS amount
         FROM accounts a
         LEFT JOIN transaction_lines tl ON tl.account_id = a.id
         LEFT JOIN transactions t ON t.id = tl.transaction_id
           AND t.txn_date BETWEEN ? AND ?
         WHERE a.type = 'expense' AND a.status = 'approved'
         GROUP BY a.id, a.account_code, a.category
         ORDER BY a.account_code"
    )
    .bind(from).bind(to)
    .fetch_all(db).await?;

    let total_income: f64  = income_rows.iter()
        .map(|r| r.amount.try_into().unwrap_or(0.0_f64))
        .sum();
    let total_expense: f64 = expense_rows.iter()
        .map(|r| r.amount.try_into().unwrap_or(0.0_f64))
        .sum();

    // Attach percentage
    let income_json: Vec<_> = income_rows.iter().map(|r| {
        let amt: f64 = r.amount.try_into().unwrap_or(0.0);
        let pct = if total_income > 0.0 { amt / total_income * 100.0 } else { 0.0 };
        json!({ "accountCode": r.account_code, "accountName": r.account_name, "amount": amt, "percentage": (pct * 100.0).round() / 100.0 })
    }).collect();

    let expense_json: Vec<_> = expense_rows.iter().map(|r| {
        let amt: f64 = r.amount.try_into().unwrap_or(0.0);
        let pct = if total_expense > 0.0 { amt / total_expense * 100.0 } else { 0.0 };
        json!({ "accountCode": r.account_code, "accountName": r.account_name, "amount": amt, "percentage": (pct * 100.0).round() / 100.0 })
    }).collect();

    Ok(HttpResponse::Ok().json(json!({
        "income":        income_json,
        "expense":       expense_json,
        "totalIncome":   total_income,
        "totalExpense":  total_expense,
        "netProfit":     total_income - total_expense,
    })))
}

// ── Cash Flow ─────────────────────────────────────────────────
#[derive(Debug, sqlx::FromRow)]
struct CashFlowRaw {
    date:        NaiveDate,
    description: Option<String>,
    reference:   Option<String>,
    inflow:      Decimal,
    outflow:     Decimal,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CashFlowRow {
    date:            NaiveDate,
    description:     Option<String>,
    reference:       Option<String>,
    inflow:          f64,
    outflow:         f64,
    running_balance: f64,
}

pub async fn cash_flow(
    pool:  web::Data<MySqlPool>,
    query: web::Query<DateRange>,
) -> Result<HttpResponse, AppError> {
    let db   = pool.get_ref();
    let from = query.from.unwrap_or(NaiveDate::from_ymd_opt(1970, 1, 1).unwrap());
    let to   = query.to.unwrap_or(NaiveDate::from_ymd_opt(9999, 12, 31).unwrap());

    let raw: Vec<CashFlowRaw> = sqlx::query_as(
        "SELECT
           t.txn_date AS date,
           t.description,
           t.reference,
           COALESCE(SUM(CASE WHEN a.type='asset' THEN GREATEST(tl.debit  - tl.credit, 0) ELSE 0 END), 0) AS inflow,
           COALESCE(SUM(CASE WHEN a.type='asset' THEN GREATEST(tl.credit - tl.debit,  0) ELSE 0 END), 0) AS outflow
         FROM transactions t
         LEFT JOIN transaction_lines tl ON tl.transaction_id = t.id
         LEFT JOIN accounts a ON a.id = tl.account_id
         WHERE t.txn_date BETWEEN ? AND ? AND a.status = 'approved'
         GROUP BY t.id, t.txn_date, t.description, t.reference
         ORDER BY t.txn_date, t.id"
    )
    .bind(from).bind(to)
    .fetch_all(db).await?;

    // Opening balance (all transactions before `from`)
    let (opening,): (Decimal,) = sqlx::query_as(
        "SELECT COALESCE(SUM(CASE WHEN a.type='asset'
           THEN tl.debit - tl.credit ELSE 0 END), 0)
         FROM transaction_lines tl
         JOIN accounts a ON a.id = tl.account_id
         JOIN transactions t ON t.id = tl.transaction_id
         WHERE t.txn_date < ? AND a.status = 'approved'"
    )
    .bind(from)
    .fetch_one(db).await?;

    let mut running: f64 = opening.try_into().unwrap_or(0.0);
    let rows: Vec<CashFlowRow> = raw.into_iter().map(|r| {
        let inf: f64  = r.inflow.try_into().unwrap_or(0.0);
        let out: f64  = r.outflow.try_into().unwrap_or(0.0);
        running += inf - out;
        CashFlowRow {
            date:            r.date,
            description:     r.description,
            reference:       r.reference,
            inflow:          inf,
            outflow:         out,
            running_balance: (running * 100.0).round() / 100.0,
        }
    }).collect();

    Ok(HttpResponse::Ok().json(rows))
}

// ── Balance Sheet ─────────────────────────────────────────────
#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct BSRow {
    account_code: Option<String>,
    category:     Option<String>,
    balance:      Decimal,
}

pub async fn balance_sheet(pool: web::Data<MySqlPool>) -> Result<HttpResponse, AppError> {
    let db = pool.get_ref();

    // Assets: normal debit balance
    let assets: Vec<BSRow> = sqlx::query_as(
        "SELECT a.account_code, a.category,
                COALESCE(SUM(tl.debit - tl.credit), 0) AS balance
         FROM accounts a
         LEFT JOIN transaction_lines tl ON tl.account_id = a.id
         WHERE a.type = 'asset' AND a.status = 'approved'
         GROUP BY a.id, a.account_code, a.category
         ORDER BY a.account_code"
    ).fetch_all(db).await?;

    // Liabilities: normal credit balance
    let liabilities: Vec<BSRow> = sqlx::query_as(
        "SELECT a.account_code, a.category,
                COALESCE(SUM(tl.credit - tl.debit), 0) AS balance
         FROM accounts a
         LEFT JOIN transaction_lines tl ON tl.account_id = a.id
         WHERE a.type = 'liability' AND a.status = 'approved'
         GROUP BY a.id, a.account_code, a.category
         ORDER BY a.account_code"
    ).fetch_all(db).await?;

    // Equity: normal credit balance
    let equity: Vec<BSRow> = sqlx::query_as(
        "SELECT a.account_code, a.category,
                COALESCE(SUM(tl.credit - tl.debit), 0) AS balance
         FROM accounts a
         LEFT JOIN transaction_lines tl ON tl.account_id = a.id
         WHERE a.type = 'equity' AND a.status = 'approved'
         GROUP BY a.id, a.account_code, a.category
         ORDER BY a.account_code"
    ).fetch_all(db).await?;

    let total_assets: f64 = assets.iter()
        .map(|r| r.balance.try_into().unwrap_or(0.0_f64))
        .sum();
    let total_liab: f64   = liabilities.iter()
        .map(|r| r.balance.try_into().unwrap_or(0.0_f64))
        .sum();
    let total_equity: f64 = equity.iter()
        .map(|r| r.balance.try_into().unwrap_or(0.0_f64))
        .sum();

    Ok(HttpResponse::Ok().json(json!({
        "assets":               assets,
        "liabilities":          liabilities,
        "equity":               equity,
        "totalAssets":          total_assets,
        "totalLiabilitiesEquity": total_liab + total_equity,
    })))
}

// ── Bank Statement ────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct BankStmtQuery {
    pub bank_account_id: Option<i64>,
    pub from: Option<NaiveDate>,
    pub to:   Option<NaiveDate>,
}

#[derive(Debug, sqlx::FromRow)]
struct BankStmtRaw {
    transaction_id: i64,
    txn_date:       NaiveDate,
    description:    Option<String>,
    reference:      Option<String>,
    bank_account_id: Option<i64>,
    bank_name:      Option<String>,
    account_number: Option<String>,
    debit:          Decimal,
    credit:         Decimal,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BankStmtRow {
    transaction_id:  i64,
    txn_date:        NaiveDate,
    description:     Option<String>,
    reference:       Option<String>,
    bank_account_id: Option<i64>,
    bank_name:       Option<String>,
    account_number:  Option<String>,
    debit:           f64,
    credit:          f64,
    balance:         f64,
}

pub async fn bank_statement(
    pool:  web::Data<MySqlPool>,
    query: web::Query<BankStmtQuery>,
) -> Result<HttpResponse, AppError> {
    let db   = pool.get_ref();
    let from = query.from.unwrap_or(NaiveDate::from_ymd_opt(1970, 1, 1).unwrap());
    let to   = query.to.unwrap_or(NaiveDate::from_ymd_opt(9999, 12, 31).unwrap());
    let bid  = query.bank_account_id;

    // Opening balance (Bank ledger account_id=2, before from)
    let opening: f64 = {
        let mut q = sqlx::QueryBuilder::new(
            "SELECT COALESCE(SUM(tl.debit - tl.credit), 0)
             FROM transaction_lines tl
             JOIN transactions t ON t.id = tl.transaction_id
             WHERE tl.account_id = 2 AND t.txn_date < "
        );
        q.push_bind(from);
        if let Some(b) = bid {
            q.push(" AND t.bank_account_id = ");
            q.push_bind(b);
        }
        let (v,): (Decimal,) = q.build_query_as().fetch_one(db).await?;
        v.try_into().unwrap_or(0.0)
    };

    // Statement rows
    let raw: Vec<BankStmtRaw> = {
        let mut q = sqlx::QueryBuilder::new(
            "SELECT t.id AS transaction_id, t.txn_date, t.description, t.reference,
                    t.bank_account_id, ba.bank_name, ba.account_number,
                    tl.debit, tl.credit
             FROM transactions t
             JOIN transaction_lines tl ON tl.transaction_id = t.id AND tl.account_id = 2
             LEFT JOIN bank_accounts ba ON ba.id = t.bank_account_id
             WHERE t.txn_date BETWEEN "
        );
        q.push_bind(from);
        q.push(" AND ");
        q.push_bind(to);
        if let Some(b) = bid {
            q.push(" AND t.bank_account_id = ");
            q.push_bind(b);
        }
        q.push(" ORDER BY t.txn_date ASC, t.id ASC");
        q.build_query_as().fetch_all(db).await?
    };

    let total_debit:  f64 = raw.iter().map(|r| r.debit.try_into().unwrap_or(0.0_f64)).sum();
    let total_credit: f64 = raw.iter().map(|r| r.credit.try_into().unwrap_or(0.0_f64)).sum();

    let mut running = opening;
    let rows: Vec<BankStmtRow> = raw.into_iter().map(|r| {
        let d: f64 = r.debit.try_into().unwrap_or(0.0);
        let c: f64 = r.credit.try_into().unwrap_or(0.0);
        running += d - c;
        BankStmtRow {
            transaction_id:  r.transaction_id,
            txn_date:        r.txn_date,
            description:     r.description,
            reference:       r.reference,
            bank_account_id: r.bank_account_id,
            bank_name:       r.bank_name,
            account_number:  r.account_number,
            debit:           (d  * 100.0).round() / 100.0,
            credit:          (c  * 100.0).round() / 100.0,
            balance:         (running * 100.0).round() / 100.0,
        }
    }).collect();

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "openingBalance": (opening * 100.0).round() / 100.0,
        "totalDebit":     (total_debit  * 100.0).round() / 100.0,
        "totalCredit":    (total_credit * 100.0).round() / 100.0,
        "closingBalance": (running * 100.0).round() / 100.0,
        "rows":           rows,
    })))
}

// ── Trial Balance ─────────────────────────────────────────────
#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct TBRow {
    account_code:  Option<String>,
    account_name:  Option<String>,
    #[serde(rename = "type")]
    account_type:  String,
    total_debit:   Decimal,
    total_credit:  Decimal,
    balance:       Decimal,
}

pub async fn trial_balance(pool: web::Data<MySqlPool>) -> Result<HttpResponse, AppError> {
    let rows: Vec<TBRow> = sqlx::query_as(
        "SELECT a.account_code, a.category AS account_name, a.type AS account_type,
                COALESCE(SUM(tl.debit),  0) AS total_debit,
                COALESCE(SUM(tl.credit), 0) AS total_credit,
                COALESCE(SUM(tl.debit - tl.credit), 0) AS balance
         FROM accounts a
         LEFT JOIN transaction_lines tl ON tl.account_id = a.id
         WHERE a.status = 'approved'
         GROUP BY a.id, a.account_code, a.category, a.type
         ORDER BY a.account_code"
    )
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(rows))
}
