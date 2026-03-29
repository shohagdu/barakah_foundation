use actix_web::{web, HttpResponse};
use sqlx::MySqlPool;
use crate::{errors::AppError, models::{Meeting, MeetingPayload}};

// MySQL TIME type → TIME_FORMAT(...) দিয়ে String এ convert করি
const SELECT: &str = "
    SELECT
        id, title, date,
        TIME_FORMAT(time, '%H:%i') AS time,
        venue,
        type   AS mt_type,
        status,
        attendees,
        agenda,
        minutes
    FROM meetings
";

pub async fn list(pool: web::Data<MySqlPool>) -> Result<HttpResponse, AppError> {
    let sql = format!("{} ORDER BY date DESC, id DESC", SELECT);
    let meetings: Vec<Meeting> = sqlx::query_as(&sql)
        .fetch_all(pool.get_ref())
        .await?;
    Ok(HttpResponse::Ok().json(meetings))
}

pub async fn get_one(
    pool: web::Data<MySqlPool>,
    id:   web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    let sql = format!("{} WHERE id = ?", SELECT);
    let m: Meeting = sqlx::query_as(&sql)
        .bind(*id)
        .fetch_one(pool.get_ref())
        .await?;
    Ok(HttpResponse::Ok().json(m))
}

pub async fn create(
    pool:    web::Data<MySqlPool>,
    payload: web::Json<MeetingPayload>,
) -> Result<HttpResponse, AppError> {
    let p = payload.into_inner();
    let result = sqlx::query!(
        "INSERT INTO meetings (title, date, time, venue, type, status, attendees, agenda, minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        p.title,
        p.date,
        p.time,
        p.venue,
        p.mt_type.as_deref().unwrap_or("general"),
        p.status.as_deref().unwrap_or("upcoming"),
        p.attendees,
        p.agenda,
        p.minutes
    )
    .execute(pool.get_ref())
    .await?;

    let new_id = result.last_insert_id() as i64;
    let sql = format!("{} WHERE id = ?", SELECT);
    let m: Meeting = sqlx::query_as(&sql)
        .bind(new_id)
        .fetch_one(pool.get_ref())
        .await?;
    Ok(HttpResponse::Created().json(m))
}

pub async fn update(
    pool:    web::Data<MySqlPool>,
    id:      web::Path<i64>,
    payload: web::Json<MeetingPayload>,
) -> Result<HttpResponse, AppError> {
    let p = payload.into_inner();
    sqlx::query!(
        "UPDATE meetings SET title=?, date=?, time=?, venue=?, type=?, status=?,
         attendees=?, agenda=?, minutes=? WHERE id=?",
        p.title,
        p.date,
        p.time,
        p.venue,
        p.mt_type.as_deref().unwrap_or("general"),
        p.status.as_deref().unwrap_or("upcoming"),
        p.attendees,
        p.agenda,
        p.minutes,
        *id
    )
    .execute(pool.get_ref())
    .await?;

    let sql = format!("{} WHERE id = ?", SELECT);
    let m: Meeting = sqlx::query_as(&sql)
        .bind(*id)
        .fetch_one(pool.get_ref())
        .await?;
    Ok(HttpResponse::Ok().json(m))
}

pub async fn delete(
    pool: web::Data<MySqlPool>,
    id:   web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    sqlx::query!("DELETE FROM meetings WHERE id = ?", *id)
        .execute(pool.get_ref())
        .await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "deleted": true })))
}
