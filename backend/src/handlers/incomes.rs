use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::MySqlPool;
use rust_decimal::Decimal;
use chrono::NaiveDate;
use crate::errors::AppError;
use crate::auth::get_claims;

// ── Structs ─────────────────────────────────────────────────

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct IncomeCategory {
    pub id:           i64,
    pub name:         String,
    pub name_bn:      Option<String>,
    pub parent_id:    Option<i64>,
    pub account_id:   Option<i64>,
    pub account_name: Option<String>,
    pub is_active:    i8,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryPayload {
    pub name:       String,
    pub name_bn:    Option<String>,
    pub parent_id:  Option<i64>,
    pub account_id: Option<i64>,
    pub is_active:  Option<i8>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct IncomeRow {
    pub id:               i64,
    pub income_date:      NaiveDate,
    pub category:         String,
    pub source:           Option<String>,
    pub description:      String,
    pub amount:           Decimal,
    pub payment_method:   Option<String>,
    pub bank_account_id:  Option<i64>,
    pub bank_name:        Option<String>,
    pub account_id:       i64,
    pub account_name:     Option<String>,
    pub transaction_id:   Option<i64>,
    pub approved_by:      Option<i64>,
    pub approver_name:    Option<String>,
    pub status:           Option<String>,
    pub receipt_image:    Option<String>,
    pub reference:        Option<String>,
    pub notes:            Option<String>,
    pub rejection_reason: Option<String>,
    pub created_by:       i64,
    pub creator_name:     Option<String>,
    pub created_at:       Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncomePayload {
    pub income_date:     NaiveDate,
    pub category:        String,
    pub source:          Option<String>,
    pub description:     String,
    pub amount:          Decimal,
    pub payment_method:  Option<String>,
    pub bank_account_id: Option<i64>,
    pub account_id:      i64,
    pub reference:       Option<String>,
    pub receipt_image:   Option<String>,
    pub notes:           Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct IncomeQuery {
    pub from:           Option<String>,
    pub to:             Option<String>,
    pub category:       Option<String>,
    pub status:         Option<String>,
    pub payment_method: Option<String>,
    pub search:         Option<String>,
    pub page:           Option<i64>,
    pub limit:          Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct RejectPayload {
    pub reason: Option<String>,
}

const INCOME_SELECT: &str =
    "SELECT i.id, i.income_date, i.category, i.source, i.description,
            i.amount, i.payment_method, i.bank_account_id, b.bank_name,
            i.account_id, a.category AS account_name, i.transaction_id,
            i.approved_by, u1.name AS approver_name,
            i.status, i.receipt_image, i.reference, i.notes, i.rejection_reason,
            i.created_by, u2.name AS creator_name, DATE_FORMAT(i.created_at,'%Y-%m-%d %H:%i:%s') AS created_at
     FROM incomes i
     LEFT JOIN accounts a ON a.id = i.account_id
     LEFT JOIN users u1 ON u1.id = i.approved_by
     LEFT JOIN users u2 ON u2.id = i.created_by
     LEFT JOIN bank_accounts b ON b.id = i.bank_account_id";

// Income must be credited to a chart-of-accounts entry of type 'income'
async fn ensure_income_account(db: &MySqlPool, account_id: i64) -> Result<(), AppError> {
    let found: Option<(String,)> = sqlx::query_as("SELECT type FROM accounts WHERE id = ?")
        .bind(account_id).fetch_optional(db).await?;
    match found {
        Some((t,)) if t == "income" => Ok(()),
        Some(_) => Err(AppError::BadRequest("Selected account is not an income account".into())),
        None    => Err(AppError::BadRequest("Income account not found".into())),
    }
}

fn validate(body: &IncomePayload) -> Result<(), AppError> {
    if body.category.trim().is_empty() {
        return Err(AppError::BadRequest("Category is required".into()));
    }
    if body.description.trim().is_empty() {
        return Err(AppError::BadRequest("Description is required".into()));
    }
    if body.amount <= Decimal::ZERO {
        return Err(AppError::BadRequest("Amount must be greater than zero".into()));
    }
    Ok(())
}

// ── Category CRUD ────────────────────────────────────────────

pub async fn cat_list(pool: web::Data<MySqlPool>) -> Result<HttpResponse, AppError> {
    let rows: Vec<IncomeCategory> = sqlx::query_as(
        "SELECT c.id, c.name, c.name_bn, c.parent_id, c.account_id,
                a.category AS account_name, c.is_active
         FROM income_categories c
         LEFT JOIN accounts a ON a.id = c.account_id
         ORDER BY c.name"
    )
    .fetch_all(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(rows))
}

pub async fn cat_create(
    pool: web::Data<MySqlPool>,
    body: web::Json<CategoryPayload>,
) -> Result<HttpResponse, AppError> {
    if let Some(acc) = body.account_id {
        ensure_income_account(pool.get_ref(), acc).await?;
    }
    let res = sqlx::query(
        "INSERT INTO income_categories (name, name_bn, parent_id, account_id) VALUES (?,?,?,?)"
    )
    .bind(&body.name).bind(&body.name_bn).bind(body.parent_id).bind(body.account_id)
    .execute(pool.get_ref()).await?;

    let id = res.last_insert_id() as i64;
    Ok(HttpResponse::Created().json(json!({ "id": id, "message": "Category created" })))
}

pub async fn cat_update(
    pool: web::Data<MySqlPool>,
    path: web::Path<i64>,
    body: web::Json<CategoryPayload>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    if let Some(acc) = body.account_id {
        ensure_income_account(pool.get_ref(), acc).await?;
    }
    sqlx::query(
        "UPDATE income_categories
         SET name=?, name_bn=?, parent_id=?, account_id=?, is_active=COALESCE(?, is_active)
         WHERE id=?"
    )
    .bind(&body.name).bind(&body.name_bn).bind(body.parent_id).bind(body.account_id)
    .bind(body.is_active).bind(id)
    .execute(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(json!({ "message": "Category updated" })))
}

pub async fn cat_delete(
    pool: web::Data<MySqlPool>,
    path: web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    sqlx::query("UPDATE income_categories SET is_active=0 WHERE id=?")
        .bind(id).execute(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(json!({ "message": "Category deactivated" })))
}

// ── Income Summary ───────────────────────────────────────────

pub async fn summary(pool: web::Data<MySqlPool>) -> Result<HttpResponse, AppError> {
    let db = pool.get_ref();

    let (total_this_month,): (Decimal,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount),0) FROM incomes
         WHERE DATE_FORMAT(income_date,'%Y-%m') = DATE_FORMAT(NOW(),'%Y-%m')
           AND status = 'approved'"
    ).fetch_one(db).await?;

    let (total_last_month,): (Decimal,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount),0) FROM incomes
         WHERE DATE_FORMAT(income_date,'%Y-%m') = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH),'%Y-%m')
           AND status = 'approved'"
    ).fetch_one(db).await?;

    let (total_this_year,): (Decimal,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount),0) FROM incomes
         WHERE YEAR(income_date) = YEAR(NOW()) AND status = 'approved'"
    ).fetch_one(db).await?;

    let (pending_count, pending_amount): (i64, Decimal) = sqlx::query_as(
        "SELECT COUNT(*), COALESCE(SUM(amount),0) FROM incomes WHERE status='pending'"
    ).fetch_one(db).await?;

    #[derive(sqlx::FromRow, Serialize)]
    #[serde(rename_all = "camelCase")]
    struct ByCat { category: String, total: Decimal, count: i64 }

    let by_category: Vec<ByCat> = sqlx::query_as(
        "SELECT category, COALESCE(SUM(amount),0) AS total, COUNT(*) AS count
         FROM incomes WHERE status = 'approved'
         GROUP BY category ORDER BY total DESC"
    ).fetch_all(db).await?;

    let tmf: f64 = total_this_month.try_into().unwrap_or(0.0);
    let lmf: f64 = total_last_month.try_into().unwrap_or(0.0);
    let tyf: f64 = total_this_year.try_into().unwrap_or(0.0);
    let paf: f64 = pending_amount.try_into().unwrap_or(0.0);

    Ok(HttpResponse::Ok().json(json!({
        "totalThisMonth": tmf,
        "totalLastMonth": lmf,
        "totalThisYear":  tyf,
        "pendingCount":   pending_count,
        "pendingAmount":  paf,
        "byCategory":     by_category,
    })))
}

// ── Income List ──────────────────────────────────────────────

pub async fn list(
    pool:  web::Data<MySqlPool>,
    query: web::Query<IncomeQuery>,
) -> Result<HttpResponse, AppError> {
    let db     = pool.get_ref();
    let page   = query.page.unwrap_or(1).max(1);
    let limit  = query.limit.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * limit;

    let mut count_q = sqlx::QueryBuilder::new(
        "SELECT COUNT(*), COALESCE(SUM(i.amount),0) FROM incomes i WHERE 1=1"
    );
    let mut data_q = sqlx::QueryBuilder::new(INCOME_SELECT);
    data_q.push(" WHERE 1=1");

    macro_rules! push_filter {
        ($sql:expr, $val:expr) => {
            count_q.push($sql); count_q.push_bind($val.clone());
            data_q.push($sql);  data_q.push_bind($val.clone());
        };
    }

    if let Some(f) = query.from.as_ref().filter(|s| !s.is_empty()) {
        push_filter!(" AND i.income_date >= ", f);
    }
    if let Some(t) = query.to.as_ref().filter(|s| !s.is_empty()) {
        push_filter!(" AND i.income_date <= ", t);
    }
    if let Some(c) = query.category.as_ref().filter(|s| !s.is_empty()) {
        push_filter!(" AND i.category = ", c);
    }
    if let Some(s) = query.status.as_ref().filter(|s| !s.is_empty()) {
        push_filter!(" AND i.status = ", s);
    }
    if let Some(pm) = query.payment_method.as_ref().filter(|s| !s.is_empty()) {
        push_filter!(" AND i.payment_method = ", pm);
    }
    if let Some(srch) = query.search.as_ref().filter(|s| !s.is_empty()) {
        let like = format!("%{}%", srch);
        push_filter!(" AND (i.description LIKE ", like);
        push_filter!(" OR i.source LIKE ", like);
        push_filter!(" OR i.category LIKE ", like);
        push_filter!(" OR i.reference LIKE ", like);
        count_q.push(")");
        data_q.push(")");
    }

    let (total_count, total_amount): (i64, Decimal) = count_q.build_query_as().fetch_one(db).await?;

    data_q.push(" ORDER BY i.income_date DESC, i.id DESC LIMIT ");
    data_q.push_bind(limit);
    data_q.push(" OFFSET ");
    data_q.push_bind(offset);

    let rows: Vec<IncomeRow> = data_q.build_query_as().fetch_all(db).await?;
    let total_amount: f64 = total_amount.try_into().unwrap_or(0.0);

    Ok(HttpResponse::Ok().json(json!({
        "data":        rows,
        "totalCount":  total_count,
        "totalAmount": total_amount,
        "page":        page,
        "limit":       limit,
        "totalPages":  (total_count as f64 / limit as f64).ceil() as i64,
    })))
}

// ── Income Get One ───────────────────────────────────────────

pub async fn get_one(
    pool: web::Data<MySqlPool>,
    path: web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let row: IncomeRow = sqlx::query_as(&format!("{INCOME_SELECT} WHERE i.id = ?"))
        .bind(id).fetch_one(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(row))
}

// ── Income Create ────────────────────────────────────────────

pub async fn create(
    req:  HttpRequest,
    pool: web::Data<MySqlPool>,
    body: web::Json<IncomePayload>,
) -> Result<HttpResponse, AppError> {
    let claims = get_claims(&req)
        .ok_or_else(|| AppError::BadRequest("Unauthorized".into()))?;
    let user_id: i64 = claims.sub.parse().unwrap_or(0);

    validate(&body)?;
    ensure_income_account(pool.get_ref(), body.account_id).await?;

    let res = sqlx::query(
        "INSERT INTO incomes
         (income_date, category, source, description, amount,
          payment_method, bank_account_id, account_id, receipt_image,
          reference, notes, created_by, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pending')"
    )
    .bind(body.income_date)
    .bind(&body.category)
    .bind(&body.source)
    .bind(&body.description)
    .bind(body.amount)
    .bind(body.payment_method.as_deref().unwrap_or("cash"))
    .bind(body.bank_account_id)
    .bind(body.account_id)
    .bind(&body.receipt_image)
    .bind(&body.reference)
    .bind(&body.notes)
    .bind(user_id)
    .execute(pool.get_ref()).await?;

    let id = res.last_insert_id() as i64;

    sqlx::query(
        "INSERT INTO audit_logs (action, table_name, new_value) VALUES (?,?,?)"
    )
    .bind("CREATE").bind("incomes")
    .bind(format!("income #{}: {} - {}", id, body.category, body.description))
    .execute(pool.get_ref()).await.ok();

    Ok(HttpResponse::Created().json(json!({ "id": id, "message": "Income submitted" })))
}

// ── Income Update ────────────────────────────────────────────

pub async fn update(
    req:  HttpRequest,
    pool: web::Data<MySqlPool>,
    path: web::Path<i64>,
    body: web::Json<IncomePayload>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    get_claims(&req).ok_or_else(|| AppError::BadRequest("Unauthorized".into()))?;

    let (status,): (Option<String>,) = sqlx::query_as(
        "SELECT status FROM incomes WHERE id = ?"
    ).bind(id).fetch_one(pool.get_ref()).await?;

    if status.as_deref() != Some("pending") {
        return Err(AppError::BadRequest("Only pending incomes can be edited".into()));
    }

    validate(&body)?;
    ensure_income_account(pool.get_ref(), body.account_id).await?;

    sqlx::query(
        "UPDATE incomes SET income_date=?, category=?, source=?, description=?,
         amount=?, payment_method=?, bank_account_id=?, account_id=?,
         receipt_image=?, reference=?, notes=? WHERE id=?"
    )
    .bind(body.income_date)
    .bind(&body.category)
    .bind(&body.source)
    .bind(&body.description)
    .bind(body.amount)
    .bind(body.payment_method.as_deref().unwrap_or("cash"))
    .bind(body.bank_account_id)
    .bind(body.account_id)
    .bind(&body.receipt_image)
    .bind(&body.reference)
    .bind(&body.notes)
    .bind(id)
    .execute(pool.get_ref()).await?;

    sqlx::query(
        "INSERT INTO audit_logs (action, table_name, new_value) VALUES (?,?,?)"
    )
    .bind("UPDATE").bind("incomes")
    .bind(format!("Updated income #{}", id))
    .execute(pool.get_ref()).await.ok();

    Ok(HttpResponse::Ok().json(json!({ "message": "Income updated" })))
}

// ── Income Delete ────────────────────────────────────────────

pub async fn delete(
    req:  HttpRequest,
    pool: web::Data<MySqlPool>,
    path: web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let claims = get_claims(&req)
        .ok_or_else(|| AppError::BadRequest("Unauthorized".into()))?;

    if claims.role != "admin" {
        return Err(AppError::BadRequest("Only admins can delete incomes".into()));
    }

    let (status,): (Option<String>,) = sqlx::query_as(
        "SELECT status FROM incomes WHERE id = ?"
    ).bind(id).fetch_one(pool.get_ref()).await?;

    if status.as_deref() == Some("approved") {
        return Err(AppError::BadRequest("Approved incomes cannot be deleted".into()));
    }

    sqlx::query("DELETE FROM incomes WHERE id=?")
        .bind(id).execute(pool.get_ref()).await?;

    sqlx::query(
        "INSERT INTO audit_logs (action, table_name, old_value) VALUES (?,?,?)"
    )
    .bind("DELETE").bind("incomes")
    .bind(format!("Deleted income #{}", id))
    .execute(pool.get_ref()).await.ok();

    Ok(HttpResponse::Ok().json(json!({ "message": "Income deleted" })))
}

// ── Income Approve (posts to accounts) ───────────────────────

pub async fn approve(
    req:  HttpRequest,
    pool: web::Data<MySqlPool>,
    path: web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let claims = get_claims(&req)
        .ok_or_else(|| AppError::BadRequest("Unauthorized".into()))?;
    let user_id: i64 = claims.sub.parse().unwrap_or(0);

    if claims.role != "admin" && claims.role != "accountant" {
        return Err(AppError::BadRequest("Not authorized to approve incomes".into()));
    }

    let mut tx = pool.begin().await?;

    // Row lock so a double-click cannot post the same income twice
    let (status, income_date, amount, payment_method, bank_account_id, account_id, description, reference):
        (Option<String>, NaiveDate, Decimal, Option<String>, Option<i64>, i64, String, Option<String>) =
        sqlx::query_as(
            "SELECT status, income_date, amount, payment_method, bank_account_id,
                    account_id, description, reference
             FROM incomes WHERE id = ? FOR UPDATE"
        ).bind(id).fetch_one(&mut *tx).await?;

    if status.as_deref() != Some("pending") {
        return Err(AppError::BadRequest("Only pending incomes can be approved".into()));
    }

    // Debit account: cash=id 1, bank/mobile=id 2 (same convention as expenses)
    let (debit_account_id, txn_bank_id): (i64, Option<i64>) = match payment_method.as_deref() {
        Some("bank") | Some("mobile_banking") => (2, bank_account_id),
        _ => (1, None),
    };

    let tx_res = sqlx::query(
        "INSERT INTO transactions (txn_date, description, reference, bank_account_id, created_by)
         VALUES (?, ?, ?, ?, ?)"
    )
    .bind(income_date)
    .bind(format!("Income: {}", description))
    .bind(reference.unwrap_or_else(|| format!("INC-{}", id)))
    .bind(txn_bank_id)
    .bind(user_id)
    .execute(&mut *tx).await?;

    let tx_id = tx_res.last_insert_id() as i64;

    // DEBIT cash/bank (money in)
    sqlx::query(
        "INSERT INTO transaction_lines (transaction_id, account_id, debit, credit) VALUES (?,?,?,0)"
    )
    .bind(tx_id).bind(debit_account_id).bind(amount)
    .execute(&mut *tx).await?;

    // CREDIT income account
    sqlx::query(
        "INSERT INTO transaction_lines (transaction_id, account_id, debit, credit) VALUES (?,?,0,?)"
    )
    .bind(tx_id).bind(account_id).bind(amount)
    .execute(&mut *tx).await?;

    sqlx::query(
        "UPDATE incomes SET status='approved', approved_by=?, transaction_id=? WHERE id=?"
    )
    .bind(user_id).bind(tx_id).bind(id)
    .execute(&mut *tx).await?;

    tx.commit().await?;

    sqlx::query(
        "INSERT INTO audit_logs (action, table_name, new_value) VALUES (?,?,?)"
    )
    .bind("APPROVE").bind("incomes")
    .bind(format!("Approved income #{}, transaction #{} created", id, tx_id))
    .execute(pool.get_ref()).await.ok();

    Ok(HttpResponse::Ok().json(json!({
        "message": "Income approved and transaction created",
        "transactionId": tx_id
    })))
}

// ── Income Reject ────────────────────────────────────────────

pub async fn reject(
    req:  HttpRequest,
    pool: web::Data<MySqlPool>,
    path: web::Path<i64>,
    body: web::Json<RejectPayload>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let claims = get_claims(&req)
        .ok_or_else(|| AppError::BadRequest("Unauthorized".into()))?;
    let user_id: i64 = claims.sub.parse().unwrap_or(0);

    if claims.role != "admin" && claims.role != "accountant" {
        return Err(AppError::BadRequest("Not authorized to reject incomes".into()));
    }

    let res = sqlx::query(
        "UPDATE incomes SET status='rejected', approved_by=?, rejection_reason=?
         WHERE id=? AND status='pending'"
    )
    .bind(user_id)
    .bind(body.reason.as_deref().unwrap_or(""))
    .bind(id)
    .execute(pool.get_ref()).await?;

    if res.rows_affected() == 0 {
        return Err(AppError::BadRequest("Only pending incomes can be rejected".into()));
    }

    sqlx::query(
        "INSERT INTO audit_logs (action, table_name, new_value) VALUES (?,?,?)"
    )
    .bind("REJECT").bind("incomes")
    .bind(format!("Rejected income #{}: {}", id, body.reason.as_deref().unwrap_or("")))
    .execute(pool.get_ref()).await.ok();

    Ok(HttpResponse::Ok().json(json!({ "message": "Income rejected" })))
}

// ── Report: Income Summary ───────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ReportQuery {
    pub from:     Option<String>,
    pub to:       Option<String>,
    pub group_by: Option<String>,
}

pub async fn report_summary(
    pool:  web::Data<MySqlPool>,
    query: web::Query<ReportQuery>,
) -> Result<HttpResponse, AppError> {
    let db   = pool.get_ref();
    let from = query.from.as_deref().filter(|s| !s.is_empty()).unwrap_or("1970-01-01");
    let to   = query.to.as_deref().filter(|s| !s.is_empty()).unwrap_or("9999-12-31");

    let select = match query.group_by.as_deref().unwrap_or("category") {
        "month"          => "DATE_FORMAT(income_date,'%Y-%m') AS grp_key",
        "payment_method" => "COALESCE(payment_method,'cash') AS grp_key",
        "source"         => "COALESCE(NULLIF(source,''),'—') AS grp_key",
        _                => "category AS grp_key",
    };

    let sql = format!(
        "SELECT {select}, COALESCE(SUM(amount),0) AS total, COUNT(*) AS count
         FROM incomes
         WHERE income_date BETWEEN ? AND ? AND status = 'approved'
         GROUP BY grp_key ORDER BY total DESC"
    );

    #[derive(sqlx::FromRow, Serialize)]
    #[serde(rename_all = "camelCase")]
    struct GrpRow { grp_key: Option<String>, total: Decimal, count: i64 }

    let rows: Vec<GrpRow> = sqlx::query_as(&sql)
        .bind(from).bind(to)
        .fetch_all(db).await?;

    #[derive(sqlx::FromRow, Serialize)]
    struct MonthRow { month: Option<String>, total: Decimal }

    let trend: Vec<MonthRow> = sqlx::query_as(
        "SELECT DATE_FORMAT(income_date,'%Y-%m') AS month, COALESCE(SUM(amount),0) AS total
         FROM incomes
         WHERE income_date BETWEEN ? AND ? AND status = 'approved'
         GROUP BY month ORDER BY month"
    )
    .bind(from).bind(to)
    .fetch_all(db).await?;

    Ok(HttpResponse::Ok().json(json!({ "grouped": rows, "trend": trend })))
}
