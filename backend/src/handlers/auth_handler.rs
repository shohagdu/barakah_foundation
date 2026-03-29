// ================================================================
// Auth Handler — Register / Login / Me / Users CRUD
// ================================================================
use actix_web::{web, HttpRequest, HttpResponse};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::MySqlPool;

use crate::{auth::{generate_token, get_claims}, errors::AppError};

// ── DB Model ───────────────────────────────────────────────
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct User {
    pub id:       i64,
    pub name:     String,
    pub email:    String,
    pub mobile:   Option<String>,
    pub role:     Option<String>,
    pub status:   Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
struct UserWithPassword {
    pub id:       i64,
    pub name:     String,
    pub email:    String,
    pub password: String,
    pub mobile:   Option<String>,
    pub role:     Option<String>,
    pub status:   Option<String>,
}

// ── Payloads ───────────────────────────────────────────────
#[derive(Debug, Deserialize)]
pub struct RegisterPayload {
    pub name:     String,
    pub email:    String,
    pub password: String,
    pub mobile:   Option<String>,
    pub role:     Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginPayload {
    pub email:    String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserPayload {
    pub name:     Option<String>,
    pub mobile:   Option<String>,
    pub role:     Option<String>,
    pub status:   Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token:   String,
    pub user:    User,
    pub expires: String,
}

// ── REGISTER ──────────────────────────────────────────────
pub async fn register(
    pool:    web::Data<MySqlPool>,
    payload: web::Json<RegisterPayload>,
) -> Result<HttpResponse, AppError> {
    let p = payload.into_inner();

    // Email already exists?
    let existing: Option<(i64,)> = sqlx::query_as(
        "SELECT id FROM users WHERE email = ?"
    )
    .bind(&p.email)
    .fetch_optional(pool.get_ref())
    .await?;

    if existing.is_some() {
        return Err(AppError::BadRequest("এই ইমেইল ইতোমধ্যে নিবন্ধিত".into()));
    }

    // Hash password
    let hashed = hash(&p.password, DEFAULT_COST)
        .map_err(|e| AppError::BadRequest(format!("Password hashing failed: {}", e)))?;

    // Role validation
    let role = match p.role.as_deref().unwrap_or("member") {
        "admin" | "accountant" | "member" | "viewer" => p.role.as_deref().unwrap_or("member"),
        _ => "member",
    };

    let result = sqlx::query!(
        "INSERT INTO users (name, email, password, mobile, role) VALUES (?, ?, ?, ?, ?)",
        p.name, p.email, hashed, p.mobile, role
    )
    .execute(pool.get_ref())
    .await?;

    let new_id = result.last_insert_id() as i64;

    let user: User = sqlx::query_as(
        "SELECT id, name, email, mobile, role, status FROM users WHERE id = ?"
    )
    .bind(new_id)
    .fetch_one(pool.get_ref())
    .await?;

    let token = generate_token(
        user.id, &user.email,
        user.role.as_deref().unwrap_or("member"),
        &user.name,
    ).map_err(|e| AppError::BadRequest(format!("Token generation failed: {}", e)))?;

    Ok(HttpResponse::Created().json(AuthResponse {
        expires: "24h".into(),
        token,
        user,
    }))
}

// ── LOGIN ─────────────────────────────────────────────────
pub async fn login(
    pool:    web::Data<MySqlPool>,
    payload: web::Json<LoginPayload>,
) -> Result<HttpResponse, AppError> {
    let p = payload.into_inner();

    // Find user
    let user: Option<UserWithPassword> = sqlx::query_as(
        "SELECT id, name, email, password, mobile, role, status FROM users WHERE email = ?"
    )
    .bind(&p.email)
    .fetch_optional(pool.get_ref())
    .await?;

    let user = user.ok_or_else(|| AppError::BadRequest("ইমেইল বা পাসওয়ার্ড ভুল".into()))?;

    // Check suspended
    if user.status.as_deref() == Some("suspended") || user.status.as_deref() == Some("inactive") {
        return Err(AppError::BadRequest("আপনার অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে".into()));
    }

    // Verify password
    let valid = verify(&p.password, &user.password)
        .map_err(|_| AppError::BadRequest("ইমেইল বা পাসওয়ার্ড ভুল".into()))?;

    if !valid {
        return Err(AppError::BadRequest("ইমেইল বা পাসওয়ার্ড ভুল".into()));
    }

    // Update last login
    let _ = sqlx::query!("UPDATE users SET last_login=? WHERE id=?", Utc::now().naive_utc(), user.id)
        .execute(pool.get_ref()).await;

    // Generate token
    let token = generate_token(
        user.id, &user.email,
        user.role.as_deref().unwrap_or("member"),
        &user.name,
    ).map_err(|e| AppError::BadRequest(format!("Token error: {}", e)))?;

    Ok(HttpResponse::Ok().json(AuthResponse {
        expires: "24h".into(),
        token,
        user: User {
            id:     user.id,
            name:   user.name,
            email:  user.email,
            mobile: user.mobile,
            role:   user.role,
            status: user.status,
        },
    }))
}

// ── ME (current user) ─────────────────────────────────────
pub async fn me(
    pool: web::Data<MySqlPool>,
    req:  HttpRequest,
) -> Result<HttpResponse, AppError> {
    let claims = get_claims(&req)
        .ok_or_else(|| AppError::BadRequest("Unauthorized".into()))?;

    let id: i64 = claims.sub.parse().unwrap_or(0);
    let user: User = sqlx::query_as(
        "SELECT id, name, email, mobile, role, status FROM users WHERE id = ?"
    )
    .bind(id)
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(user))
}

// ── LIST USERS (admin only) ───────────────────────────────
pub async fn list_users(
    pool: web::Data<MySqlPool>,
    req:  HttpRequest,
) -> Result<HttpResponse, AppError> {
    let claims = get_claims(&req)
        .ok_or_else(|| AppError::BadRequest("Unauthorized".into()))?;

    if claims.role != "admin" {
        return Err(AppError::BadRequest("শুধুমাত্র Admin এই তথ্য দেখতে পারবেন".into()));
    }

    let users: Vec<User> = sqlx::query_as(
        "SELECT id, name, email, mobile, role, status FROM users ORDER BY id DESC"
    )
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(users))
}

// ── UPDATE USER ───────────────────────────────────────────
pub async fn update_user(
    pool:    web::Data<MySqlPool>,
    id:      web::Path<i64>,
    payload: web::Json<UpdateUserPayload>,
    req:     HttpRequest,
) -> Result<HttpResponse, AppError> {
    let claims = get_claims(&req)
        .ok_or_else(|| AppError::BadRequest("Unauthorized".into()))?;

    let caller_id: i64 = claims.sub.parse().unwrap_or(0);
    // Only admin or self can update
    if claims.role != "admin" && caller_id != *id {
        return Err(AppError::BadRequest("অনুমতি নেই".into()));
    }

    let p = payload.into_inner();

    // Update password if provided
    if let Some(ref pw) = p.password {
        let hashed = hash(pw, DEFAULT_COST)
            .map_err(|e| AppError::BadRequest(e.to_string()))?;
        sqlx::query!("UPDATE users SET password=? WHERE id=?", hashed, *id)
            .execute(pool.get_ref()).await?;
    }

    if let Some(ref name) = p.name {
        sqlx::query!("UPDATE users SET name=? WHERE id=?", name, *id)
            .execute(pool.get_ref()).await?;
    }
    if let Some(ref mobile) = p.mobile {
        sqlx::query!("UPDATE users SET mobile=? WHERE id=?", mobile, *id)
            .execute(pool.get_ref()).await?;
    }
    // Only admin can change role/status
    if claims.role == "admin" {
        if let Some(ref role) = p.role {
            sqlx::query!("UPDATE users SET role=? WHERE id=?", role, *id)
                .execute(pool.get_ref()).await?;
        }
        if let Some(ref status) = p.status {
            sqlx::query!("UPDATE users SET status=? WHERE id=?", status, *id)
                .execute(pool.get_ref()).await?;
        }
    }

    let user: User = sqlx::query_as(
        "SELECT id, name, email, mobile, role, status FROM users WHERE id = ?"
    )
    .bind(*id)
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(user))
}

// ── DELETE USER (admin only) ──────────────────────────────
pub async fn delete_user(
    pool: web::Data<MySqlPool>,
    id:   web::Path<i64>,
    req:  HttpRequest,
) -> Result<HttpResponse, AppError> {
    let claims = get_claims(&req)
        .ok_or_else(|| AppError::BadRequest("Unauthorized".into()))?;

    if claims.role != "admin" {
        return Err(AppError::BadRequest("শুধুমাত্র Admin এই কাজ করতে পারবেন".into()));
    }

    sqlx::query!("DELETE FROM users WHERE id = ?", *id)
        .execute(pool.get_ref()).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({ "deleted": true })))
}
