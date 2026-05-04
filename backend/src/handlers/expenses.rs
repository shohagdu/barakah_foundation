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
pub struct ExpenseCategory {
    pub id:        i64,
    pub name:      String,
    pub name_bn:   Option<String>,
    pub parent_id: Option<i64>,
    pub account_id: Option<i64>,
    pub is_active: i8,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryPayload {
    pub name:       String,
    pub name_bn:    Option<String>,
    pub parent_id:  Option<i64>,
    pub account_id: Option<i64>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseRow {
    pub id:             i64,
    pub expense_date:   NaiveDate,
    pub category:       String,
    pub sub_category:   Option<String>,
    pub description:    String,
    pub amount:         Decimal,
    pub payment_method: Option<String>,
    pub bank_account_id: Option<i64>,
    pub bank_name:      Option<String>,
    pub account_id:     i64,
    pub approved_by:    Option<i64>,
    pub approver_name:  Option<String>,
    pub status:         Option<String>,
    pub receipt_image:  Option<String>,
    pub reference:      Option<String>,
    pub notes:          Option<String>,
    pub rejection_reason: Option<String>,
    pub created_by:     i64,
    pub creator_name:   Option<String>,
    pub created_at:     Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpensePayload {
    pub expense_date:   NaiveDate,
    pub category:       String,
    pub sub_category:   Option<String>,
    pub description:    String,
    pub amount:         Decimal,
    pub payment_method: Option<String>,
    pub bank_account_id: Option<i64>,
    pub account_id:     Option<i64>,
    pub reference:      Option<String>,
    pub receipt_image:  Option<String>,
    pub notes:          Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ExpenseQuery {
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

// ── Category CRUD ────────────────────────────────────────────

pub async fn cat_list(pool: web::Data<MySqlPool>) -> Result<HttpResponse, AppError> {
    let rows: Vec<ExpenseCategory> = sqlx::query_as(
        "SELECT id, name, name_bn, parent_id, account_id, is_active
         FROM expense_categories ORDER BY name"
    )
    .fetch_all(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(rows))
}

pub async fn cat_create(
    pool: web::Data<MySqlPool>,
    body: web::Json<CategoryPayload>,
) -> Result<HttpResponse, AppError> {
    let res = sqlx::query(
        "INSERT INTO expense_categories (name, name_bn, parent_id, account_id) VALUES (?,?,?,?)"
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
    sqlx::query(
        "UPDATE expense_categories SET name=?, name_bn=?, parent_id=?, account_id=? WHERE id=?"
    )
    .bind(&body.name).bind(&body.name_bn).bind(body.parent_id).bind(body.account_id).bind(id)
    .execute(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(json!({ "message": "Category updated" })))
}

pub async fn cat_delete(
    pool: web::Data<MySqlPool>,
    path: web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    sqlx::query("UPDATE expense_categories SET is_active=0 WHERE id=?")
        .bind(id).execute(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(json!({ "message": "Category deactivated" })))
}

// ── Expense Summary ──────────────────────────────────────────

pub async fn summary(pool: web::Data<MySqlPool>) -> Result<HttpResponse, AppError> {
    let db = pool.get_ref();

    let (total_this_month,): (Decimal,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount),0) FROM expenses
         WHERE DATE_FORMAT(expense_date,'%Y-%m') = DATE_FORMAT(NOW(),'%Y-%m')
           AND status != 'rejected'"
    ).fetch_one(db).await?;

    let (total_last_month,): (Decimal,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount),0) FROM expenses
         WHERE DATE_FORMAT(expense_date,'%Y-%m') = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH),'%Y-%m')
           AND status != 'rejected'"
    ).fetch_one(db).await?;

    let (total_this_year,): (Decimal,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount),0) FROM expenses
         WHERE YEAR(expense_date) = YEAR(NOW()) AND status != 'rejected'"
    ).fetch_one(db).await?;

    let (pending_count, pending_amount): (i64, Decimal) = sqlx::query_as(
        "SELECT COUNT(*), COALESCE(SUM(amount),0) FROM expenses WHERE status='pending'"
    ).fetch_one(db).await?;

    #[derive(sqlx::FromRow, Serialize)]
    #[serde(rename_all = "camelCase")]
    struct ByCat { category: String, total: Decimal, count: i64 }

    let by_category: Vec<ByCat> = sqlx::query_as(
        "SELECT category, COALESCE(SUM(amount),0) AS total, COUNT(*) AS count
         FROM expenses WHERE status != 'rejected'
         GROUP BY category ORDER BY total DESC"
    ).fetch_all(db).await?;

    #[derive(sqlx::FromRow, Serialize)]
    #[serde(rename_all = "camelCase")]
    struct ByMethod { payment_method: Option<String>, total: Decimal }

    let by_payment_method: Vec<ByMethod> = sqlx::query_as(
        "SELECT payment_method, COALESCE(SUM(amount),0) AS total
         FROM expenses WHERE status != 'rejected'
         GROUP BY payment_method ORDER BY total DESC"
    ).fetch_all(db).await?;

    let tmf: f64 = total_this_month.try_into().unwrap_or(0.0);
    let lmf: f64 = total_last_month.try_into().unwrap_or(0.0);
    let tyf: f64 = total_this_year.try_into().unwrap_or(0.0);
    let paf: f64 = pending_amount.try_into().unwrap_or(0.0);

    Ok(HttpResponse::Ok().json(json!({
        "totalThisMonth":  tmf,
        "totalLastMonth":  lmf,
        "totalThisYear":   tyf,
        "pendingCount":    pending_count,
        "pendingAmount":   paf,
        "byCategory":      by_category,
        "byPaymentMethod": by_payment_method,
    })))
}

// ── Expense List ─────────────────────────────────────────────

pub async fn list(
    pool:  web::Data<MySqlPool>,
    query: web::Query<ExpenseQuery>,
) -> Result<HttpResponse, AppError> {
    let db    = pool.get_ref();
    let page  = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(10).min(100);
    let offset = (page - 1) * limit;

    let mut count_q = sqlx::QueryBuilder::new(
        "SELECT COUNT(*) FROM expenses e
         LEFT JOIN users u1 ON u1.id = e.approved_by
         LEFT JOIN users u2 ON u2.id = e.created_by
         LEFT JOIN bank_accounts b ON b.id = e.bank_account_id
         WHERE 1=1"
    );
    let mut data_q = sqlx::QueryBuilder::new(
        "SELECT e.id, e.expense_date, e.category, e.sub_category, e.description,
                e.amount, e.payment_method, e.bank_account_id, b.bank_name,
                e.account_id, e.approved_by, u1.name AS approver_name,
                e.status, e.receipt_image, e.reference, e.notes, e.rejection_reason,
                e.created_by, u2.name AS creator_name, DATE_FORMAT(e.created_at,'%Y-%m-%d %H:%i:%s') AS created_at
         FROM expenses e
         LEFT JOIN users u1 ON u1.id = e.approved_by
         LEFT JOIN users u2 ON u2.id = e.created_by
         LEFT JOIN bank_accounts b ON b.id = e.bank_account_id
         WHERE 1=1"
    );

    macro_rules! push_filter {
        ($q:ident, $sql:expr, $val:expr) => {
            $q.push($sql);
            $q.push_bind($val);
        };
    }

    if let Some(f) = &query.from {
        if !f.is_empty() {
            push_filter!(count_q, " AND e.expense_date >= ", f.clone());
            push_filter!(data_q,  " AND e.expense_date >= ", f.clone());
        }
    }
    if let Some(t) = &query.to {
        if !t.is_empty() {
            push_filter!(count_q, " AND e.expense_date <= ", t.clone());
            push_filter!(data_q,  " AND e.expense_date <= ", t.clone());
        }
    }
    if let Some(c) = &query.category {
        if !c.is_empty() {
            push_filter!(count_q, " AND e.category = ", c.clone());
            push_filter!(data_q,  " AND e.category = ", c.clone());
        }
    }
    if let Some(s) = &query.status {
        if !s.is_empty() {
            push_filter!(count_q, " AND e.status = ", s.clone());
            push_filter!(data_q,  " AND e.status = ", s.clone());
        }
    }
    if let Some(pm) = &query.payment_method {
        if !pm.is_empty() {
            push_filter!(count_q, " AND e.payment_method = ", pm.clone());
            push_filter!(data_q,  " AND e.payment_method = ", pm.clone());
        }
    }
    if let Some(srch) = &query.search {
        if !srch.is_empty() {
            let like = format!("%{}%", srch);
            count_q.push(" AND (e.description LIKE "); count_q.push_bind(like.clone());
            count_q.push(" OR e.category LIKE ");      count_q.push_bind(like.clone());
            count_q.push(" OR e.reference LIKE ");     count_q.push_bind(like.clone());
            count_q.push(")");
            data_q.push(" AND (e.description LIKE ");  data_q.push_bind(like.clone());
            data_q.push(" OR e.category LIKE ");       data_q.push_bind(like.clone());
            data_q.push(" OR e.reference LIKE ");      data_q.push_bind(like.clone());
            data_q.push(")");
        }
    }

    let (total_count,): (i64,) = count_q.build_query_as().fetch_one(db).await?;

    data_q.push(" ORDER BY e.expense_date DESC, e.id DESC LIMIT ");
    data_q.push_bind(limit);
    data_q.push(" OFFSET ");
    data_q.push_bind(offset);

    let rows: Vec<ExpenseRow> = data_q.build_query_as().fetch_all(db).await?;

    let total_amount: f64 = rows.iter()
        .map(|r| r.amount.try_into().unwrap_or(0.0_f64))
        .sum();

    Ok(HttpResponse::Ok().json(json!({
        "data":        rows,
        "totalCount":  total_count,
        "totalAmount": total_amount,
        "page":        page,
        "limit":       limit,
        "totalPages":  (total_count as f64 / limit as f64).ceil() as i64,
    })))
}

// ── Expense Get One ──────────────────────────────────────────

pub async fn get_one(
    pool: web::Data<MySqlPool>,
    path: web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let row: ExpenseRow = sqlx::query_as(
        "SELECT e.id, e.expense_date, e.category, e.sub_category, e.description,
                e.amount, e.payment_method, e.bank_account_id, b.bank_name,
                e.account_id, e.approved_by, u1.name AS approver_name,
                e.status, e.receipt_image, e.reference, e.notes, e.rejection_reason,
                e.created_by, u2.name AS creator_name, DATE_FORMAT(e.created_at,'%Y-%m-%d %H:%i:%s') AS created_at
         FROM expenses e
         LEFT JOIN users u1 ON u1.id = e.approved_by
         LEFT JOIN users u2 ON u2.id = e.created_by
         LEFT JOIN bank_accounts b ON b.id = e.bank_account_id
         WHERE e.id = ?"
    )
    .bind(id).fetch_one(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(row))
}

// ── Expense Create ───────────────────────────────────────────

pub async fn create(
    req:  HttpRequest,
    pool: web::Data<MySqlPool>,
    body: web::Json<ExpensePayload>,
) -> Result<HttpResponse, AppError> {
    let claims = get_claims(&req)
        .ok_or_else(|| AppError::BadRequest("Unauthorized".into()))?;
    let user_id: i64 = claims.sub.parse().unwrap_or(0);

    let account_id = body.account_id.unwrap_or(1);

    let res = sqlx::query(
        "INSERT INTO expenses
         (expense_date, category, sub_category, description, amount,
          payment_method, bank_account_id, account_id, receipt_image,
          reference, notes, created_by, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pending')"
    )
    .bind(body.expense_date)
    .bind(&body.category)
    .bind(&body.sub_category)
    .bind(&body.description)
    .bind(body.amount)
    .bind(body.payment_method.as_deref().unwrap_or("cash"))
    .bind(body.bank_account_id)
    .bind(account_id)
    .bind(&body.receipt_image)
    .bind(&body.reference)
    .bind(&body.notes)
    .bind(user_id)
    .execute(pool.get_ref()).await?;

    let id = res.last_insert_id() as i64;

    sqlx::query(
        "INSERT INTO audit_logs (action, table_name, new_value) VALUES (?,?,?)"
    )
    .bind("CREATE").bind("expenses")
    .bind(format!("expense #{}: {} - {}", id, body.category, body.description))
    .execute(pool.get_ref()).await.ok();

    Ok(HttpResponse::Created().json(json!({ "id": id, "message": "Expense submitted" })))
}

// ── Expense Update ───────────────────────────────────────────

pub async fn update(
    req:  HttpRequest,
    pool: web::Data<MySqlPool>,
    path: web::Path<i64>,
    body: web::Json<ExpensePayload>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let claims = get_claims(&req)
        .ok_or_else(|| AppError::BadRequest("Unauthorized".into()))?;
    let _user_id: i64 = claims.sub.parse().unwrap_or(0);

    let (status,): (Option<String>,) = sqlx::query_as(
        "SELECT status FROM expenses WHERE id = ?"
    ).bind(id).fetch_one(pool.get_ref()).await?;

    if status.as_deref() != Some("pending") {
        return Err(AppError::BadRequest("Only pending expenses can be edited".into()));
    }

    let account_id = body.account_id.unwrap_or(1);

    sqlx::query(
        "UPDATE expenses SET expense_date=?, category=?, sub_category=?, description=?,
         amount=?, payment_method=?, bank_account_id=?, account_id=?,
         receipt_image=?, reference=?, notes=? WHERE id=?"
    )
    .bind(body.expense_date)
    .bind(&body.category)
    .bind(&body.sub_category)
    .bind(&body.description)
    .bind(body.amount)
    .bind(body.payment_method.as_deref().unwrap_or("cash"))
    .bind(body.bank_account_id)
    .bind(account_id)
    .bind(&body.receipt_image)
    .bind(&body.reference)
    .bind(&body.notes)
    .bind(id)
    .execute(pool.get_ref()).await?;

    sqlx::query(
        "INSERT INTO audit_logs (action, table_name, new_value) VALUES (?,?,?)"
    )
    .bind("UPDATE").bind("expenses")
    .bind(format!("Updated expense #{}", id))
    .execute(pool.get_ref()).await.ok();

    Ok(HttpResponse::Ok().json(json!({ "message": "Expense updated" })))
}

// ── Expense Delete ───────────────────────────────────────────

pub async fn delete(
    req:  HttpRequest,
    pool: web::Data<MySqlPool>,
    path: web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let claims = get_claims(&req)
        .ok_or_else(|| AppError::BadRequest("Unauthorized".into()))?;
    let _user_id: i64 = claims.sub.parse().unwrap_or(0);

    if claims.role != "admin" {
        return Err(AppError::BadRequest("Only admins can delete expenses".into()));
    }

    let (status,): (Option<String>,) = sqlx::query_as(
        "SELECT status FROM expenses WHERE id = ?"
    ).bind(id).fetch_one(pool.get_ref()).await?;

    if status.as_deref() == Some("approved") {
        return Err(AppError::BadRequest("Approved expenses cannot be deleted".into()));
    }

    sqlx::query("DELETE FROM expenses WHERE id=?")
        .bind(id).execute(pool.get_ref()).await?;

    sqlx::query(
        "INSERT INTO audit_logs (action, table_name, old_value) VALUES (?,?,?)"
    )
    .bind("DELETE").bind("expenses")
    .bind(format!("Deleted expense #{}", id))
    .execute(pool.get_ref()).await.ok();

    Ok(HttpResponse::Ok().json(json!({ "message": "Expense deleted" })))
}

// ── Expense Approve ──────────────────────────────────────────

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
        return Err(AppError::BadRequest("Not authorized to approve expenses".into()));
    }

    let (status, amount, payment_method, bank_account_id, description):
        (Option<String>, Decimal, Option<String>, Option<i64>, String) =
        sqlx::query_as(
            "SELECT status, amount, payment_method, bank_account_id, description
             FROM expenses WHERE id = ?"
        ).bind(id).fetch_one(pool.get_ref()).await?;

    if status.as_deref() != Some("pending") {
        return Err(AppError::BadRequest("Only pending expenses can be approved".into()));
    }

    // Determine credit account: cash=id 1, bank/mobile=id 2
    let credit_account_id: i64 = match payment_method.as_deref() {
        Some("bank") | Some("mobile_banking") => 2,
        _ => 1,
    };

    // Link bank_account_id on the transaction when paid via bank/mobile
    let txn_bank_id: Option<i64> = match payment_method.as_deref() {
        Some("bank") | Some("mobile_banking") => bank_account_id,
        _ => None,
    };

    // Create double-entry transaction
    let tx_res = sqlx::query(
        "INSERT INTO transactions (txn_date, description, bank_account_id, created_by) VALUES (CURDATE(), ?, ?, ?)"
    )
    .bind(format!("Expense: {}", description))
    .bind(txn_bank_id)
    .bind(user_id)
    .execute(pool.get_ref()).await?;

    let tx_id = tx_res.last_insert_id() as i64;

    // DEBIT expense account (account_id from expense)
    let (exp_account_id,): (i64,) = sqlx::query_as(
        "SELECT account_id FROM expenses WHERE id = ?"
    ).bind(id).fetch_one(pool.get_ref()).await?;

    sqlx::query(
        "INSERT INTO transaction_lines (transaction_id, account_id, debit, credit) VALUES (?,?,?,0)"
    )
    .bind(tx_id).bind(exp_account_id).bind(amount)
    .execute(pool.get_ref()).await.ok();

    // CREDIT cash/bank account
    sqlx::query(
        "INSERT INTO transaction_lines (transaction_id, account_id, debit, credit) VALUES (?,?,0,?)"
    )
    .bind(tx_id).bind(credit_account_id).bind(amount)
    .execute(pool.get_ref()).await.ok();

    // Update expense status
    sqlx::query(
        "UPDATE expenses SET status='approved', approved_by=? WHERE id=?"
    )
    .bind(user_id).bind(id).execute(pool.get_ref()).await?;

    sqlx::query(
        "INSERT INTO audit_logs (action, table_name, new_value) VALUES (?,?,?)"
    )
    .bind("APPROVE").bind("expenses")
    .bind(format!("Approved expense #{}, transaction #{} created", id, tx_id))
    .execute(pool.get_ref()).await.ok();

    Ok(HttpResponse::Ok().json(json!({
        "message": "Expense approved and transaction created",
        "transactionId": tx_id
    })))
}

// ── Expense Reject ───────────────────────────────────────────

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
        return Err(AppError::BadRequest("Not authorized to reject expenses".into()));
    }

    sqlx::query(
        "UPDATE expenses SET status='rejected', approved_by=?, rejection_reason=? WHERE id=?"
    )
    .bind(user_id)
    .bind(body.reason.as_deref().unwrap_or(""))
    .bind(id)
    .execute(pool.get_ref()).await?;

    sqlx::query(
        "INSERT INTO audit_logs (action, table_name, new_value) VALUES (?,?,?)"
    )
    .bind("REJECT").bind("expenses")
    .bind(format!("Rejected expense #{}: {}", id, body.reason.as_deref().unwrap_or("")))
    .execute(pool.get_ref()).await.ok();

    Ok(HttpResponse::Ok().json(json!({ "message": "Expense rejected" })))
}

// ── Report: Expense Summary ───────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ReportQuery {
    pub from:     Option<String>,
    pub to:       Option<String>,
    pub group_by: Option<String>,
    pub category: Option<String>,
    pub status:   Option<String>,
}

pub async fn report_summary(
    pool:  web::Data<MySqlPool>,
    query: web::Query<ReportQuery>,
) -> Result<HttpResponse, AppError> {
    let db   = pool.get_ref();
    let from = query.from.as_deref().unwrap_or("1970-01-01");
    let to   = query.to.as_deref().unwrap_or("9999-12-31");

    let group_by = query.group_by.as_deref().unwrap_or("category");

    let select = match group_by {
        "month"          => "DATE_FORMAT(expense_date,'%Y-%m') AS grp_key",
        "payment_method" => "COALESCE(payment_method,'cash') AS grp_key",
        _                => "category AS grp_key",
    };

    let sql = format!(
        "SELECT {select}, COALESCE(SUM(amount),0) AS total, COUNT(*) AS count
         FROM expenses
         WHERE expense_date BETWEEN ? AND ? AND status != 'rejected'
         GROUP BY grp_key ORDER BY total DESC"
    );

    #[derive(sqlx::FromRow, Serialize)]
    struct GrpRow { grp_key: Option<String>, total: Decimal, count: i64 }

    let rows: Vec<GrpRow> = sqlx::query_as(&sql)
        .bind(from).bind(to)
        .fetch_all(db).await?;

    // Monthly trend (last 12 months)
    #[derive(sqlx::FromRow, Serialize)]
    struct MonthRow { month: Option<String>, total: Decimal }

    let trend: Vec<MonthRow> = sqlx::query_as(
        "SELECT DATE_FORMAT(expense_date,'%Y-%m') AS month, COALESCE(SUM(amount),0) AS total
         FROM expenses
         WHERE expense_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
           AND status != 'rejected'
         GROUP BY month ORDER BY month"
    ).fetch_all(db).await?;

    Ok(HttpResponse::Ok().json(json!({ "grouped": rows, "trend": trend })))
}

pub async fn report_detail(
    pool:  web::Data<MySqlPool>,
    query: web::Query<ReportQuery>,
) -> Result<HttpResponse, AppError> {
    let db   = pool.get_ref();
    let from = query.from.as_deref().unwrap_or("1970-01-01");
    let to   = query.to.as_deref().unwrap_or("9999-12-31");

    let mut q = sqlx::QueryBuilder::new(
        "SELECT e.id, e.expense_date, e.category, e.sub_category, e.description,
                e.amount, e.payment_method, e.bank_account_id, b.bank_name,
                e.account_id, e.approved_by, u1.name AS approver_name,
                e.status, e.receipt_image, e.reference, e.notes, e.rejection_reason,
                e.created_by, u2.name AS creator_name, DATE_FORMAT(e.created_at,'%Y-%m-%d %H:%i:%s') AS created_at
         FROM expenses e
         LEFT JOIN users u1 ON u1.id = e.approved_by
         LEFT JOIN users u2 ON u2.id = e.created_by
         LEFT JOIN bank_accounts b ON b.id = e.bank_account_id
         WHERE e.expense_date BETWEEN "
    );
    q.push_bind(from);
    q.push(" AND ");
    q.push_bind(to);

    if let Some(cat) = &query.category {
        if !cat.is_empty() { q.push(" AND e.category = "); q.push_bind(cat.clone()); }
    }
    if let Some(st) = &query.status {
        if !st.is_empty() { q.push(" AND e.status = "); q.push_bind(st.clone()); }
    }

    q.push(" ORDER BY e.expense_date DESC, e.id DESC");

    let rows: Vec<ExpenseRow> = q.build_query_as().fetch_all(db).await?;
    Ok(HttpResponse::Ok().json(rows))
}
