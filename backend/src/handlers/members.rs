use actix_web::{web, HttpResponse};
use bcrypt::{hash, DEFAULT_COST};
use sqlx::MySqlPool;
use std::path::Path;
use crate::{errors::AppError, models::{Member, MemberPayload, SearchQuery}};

const SELECT: &str =
    "SELECT id, name, name_eng, phone, address, category, status, join_date, fee, notes,
            image, nid_number, nid_attachment, nominee_image, nominee_name, nominee_mobile,
            nominee_nid_attachment, nominee_address
     FROM members";

pub async fn list(
    pool:  web::Data<MySqlPool>,
    query: web::Query<SearchQuery>,
) -> Result<HttpResponse, AppError> {
    let members: Vec<Member> = match &query.search {
        Some(s) => {
            let pattern = format!("%{}%", s);
            sqlx::query_as(&format!("{} WHERE name LIKE ? OR phone LIKE ? ORDER BY id DESC", SELECT))
                .bind(&pattern).bind(&pattern)
                .fetch_all(pool.get_ref()).await?
        }
        None => {
            sqlx::query_as(&format!("{} ORDER BY id DESC", SELECT))
                .fetch_all(pool.get_ref()).await?
        }
    };
    Ok(HttpResponse::Ok().json(members))
}

pub async fn get_one(
    pool: web::Data<MySqlPool>,
    id:   web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    let member: Member = sqlx::query_as(&format!("{} WHERE id = ?", SELECT))
        .bind(*id)
        .fetch_one(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(member))
}

pub async fn create(
    pool:    web::Data<MySqlPool>,
    payload: web::Json<MemberPayload>,
) -> Result<HttpResponse, AppError> {
    let p = payload.into_inner();

    // ── 1. Create member ────────────────────────────────
    let result = sqlx::query!(
        "INSERT INTO members
            (name, name_eng, phone, address, category, status, join_date, fee, notes,
             image, nid_number, nid_attachment, nominee_image, nominee_name,
             nominee_mobile, nominee_nid_attachment, nominee_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        p.name, p.name_eng, p.phone, p.address,
        p.category.as_deref().unwrap_or("general"),
        p.status.as_deref().unwrap_or("active"),
        p.join_date, p.fee, p.notes,
        p.image, p.nid_number, p.nid_attachment,
        p.nominee_image, p.nominee_name, p.nominee_mobile,
        p.nominee_nid_attachment, p.nominee_address
    )
    .execute(pool.get_ref()).await?;

    let new_id = result.last_insert_id() as i64;

    // ── 2. Create linked user account ───────────────────
    if let (Some(email), Some(password)) = (&p.email, &p.password) {
        let email    = email.trim();
        let password = password.trim();
        if !email.is_empty() && !password.is_empty() {
            let exists: Option<(i64,)> = sqlx::query_as(
                "SELECT id FROM users WHERE email = ?"
            )
            .bind(email)
            .fetch_optional(pool.get_ref()).await?;

            if exists.is_some() {
                return Err(AppError::BadRequest(
                    "এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট আছে".into()
                ));
            }

            let hashed = hash(password, DEFAULT_COST)
                .map_err(|e| AppError::BadRequest(e.to_string()))?;

            sqlx::query!(
                "INSERT INTO users (name, email, password, mobile, role, status)
                 VALUES (?, ?, ?, ?, 'member', 'active')",
                p.name, email, hashed, p.phone
            )
            .execute(pool.get_ref()).await?;
        }
    }

    let member: Member = sqlx::query_as(&format!("{} WHERE id = ?", SELECT))
        .bind(new_id)
        .fetch_one(pool.get_ref()).await?;
    Ok(HttpResponse::Created().json(member))
}

pub async fn update(
    pool:    web::Data<MySqlPool>,
    id:      web::Path<i64>,
    payload: web::Json<MemberPayload>,
) -> Result<HttpResponse, AppError> {
    let p = payload.into_inner();
    sqlx::query!(
        "UPDATE members SET
            name=?, name_eng=?, phone=?, address=?, category=?, status=?, join_date=?, fee=?, notes=?,
            image=?, nid_number=?, nid_attachment=?, nominee_image=?, nominee_name=?,
            nominee_mobile=?, nominee_nid_attachment=?, nominee_address=?
         WHERE id=?",
        p.name, p.name_eng, p.phone, p.address,
        p.category.as_deref().unwrap_or("general"),
        p.status.as_deref().unwrap_or("active"),
        p.join_date, p.fee, p.notes,
        p.image, p.nid_number, p.nid_attachment,
        p.nominee_image, p.nominee_name, p.nominee_mobile,
        p.nominee_nid_attachment, p.nominee_address, *id
    )
    .execute(pool.get_ref()).await?;

    let member: Member = sqlx::query_as(&format!("{} WHERE id = ?", SELECT))
        .bind(*id)
        .fetch_one(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(member))
}

pub async fn delete(
    pool: web::Data<MySqlPool>,
    id:   web::Path<i64>,
) -> Result<HttpResponse, AppError> {
    sqlx::query!("DELETE FROM members WHERE id = ?", *id)
        .execute(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "deleted": true, "id": *id })))
}

pub async fn download_all_attachments(
    pool: web::Data<MySqlPool>,
) -> Result<HttpResponse, AppError> {
    let members: Vec<Member> = sqlx::query_as(&format!("{} WHERE (image IS NOT NULL OR nid_attachment IS NOT NULL OR nominee_image IS NOT NULL OR nominee_nid_attachment IS NOT NULL) ORDER BY id", SELECT))
        .fetch_all(pool.get_ref()).await?;

    // Create zip in memory
    let mut zip_buffer = Vec::new();
    {
        let mut zip = zip::ZipWriter::new(std::io::Cursor::new(&mut zip_buffer));
        let options = zip::write::FileOptions::default();

        // ── PART 1: Member-wise folders ──────────────────────────────────
        for member in &members {
            let member_folder = format!("Member_Wise/Member_{}_{}_{}",
                member.id,
                member.name.replace(" ", "_"),
                member.phone
            );

            // Add member image
            if let Some(ref path) = member.image {
                let resolved_path = if path.starts_with('/') {
                    format!(".{}", path)
                } else {
                    format!("./{}", path)
                };
                if Path::new(&resolved_path).exists() {
                    if let Ok(file_content) = std::fs::read(&resolved_path) {
                        let file_ext = Path::new(path)
                            .extension()
                            .and_then(|s| s.to_str())
                            .unwrap_or("jpg");
                        let file_name = format!("{}/image.{}", member_folder, file_ext);
                        zip.start_file(&file_name, options)?;
                        std::io::Write::write_all(&mut zip, &file_content)?;
                    }
                }
            }

            // Add NID
            if let Some(ref path) = member.nid_attachment {
                let resolved_path = if path.starts_with('/') {
                    format!(".{}", path)
                } else {
                    format!("./{}", path)
                };
                if Path::new(&resolved_path).exists() {
                    if let Ok(file_content) = std::fs::read(&resolved_path) {
                        let file_ext = Path::new(path)
                            .extension()
                            .and_then(|s| s.to_str())
                            .unwrap_or("pdf");
                        let file_name = format!("{}/nid.{}", member_folder, file_ext);
                        zip.start_file(&file_name, options)?;
                        std::io::Write::write_all(&mut zip, &file_content)?;
                    }
                }
            }

            // Add nominee image
            if let Some(ref path) = member.nominee_image {
                let resolved_path = if path.starts_with('/') {
                    format!(".{}", path)
                } else {
                    format!("./{}", path)
                };
                if Path::new(&resolved_path).exists() {
                    if let Ok(file_content) = std::fs::read(&resolved_path) {
                        let file_ext = Path::new(path)
                            .extension()
                            .and_then(|s| s.to_str())
                            .unwrap_or("jpg");
                        let file_name = format!("{}/nominee_image.{}", member_folder, file_ext);
                        zip.start_file(&file_name, options)?;
                        std::io::Write::write_all(&mut zip, &file_content)?;
                    }
                }
            }

            // Add nominee NID
            if let Some(ref path) = member.nominee_nid_attachment {
                let resolved_path = if path.starts_with('/') {
                    format!(".{}", path)
                } else {
                    format!("./{}", path)
                };
                if Path::new(&resolved_path).exists() {
                    if let Ok(file_content) = std::fs::read(&resolved_path) {
                        let file_ext = Path::new(path)
                            .extension()
                            .and_then(|s| s.to_str())
                            .unwrap_or("pdf");
                        let file_name = format!("{}/nominee_nid.{}", member_folder, file_ext);
                        zip.start_file(&file_name, options)?;
                        std::io::Write::write_all(&mut zip, &file_content)?;
                    }
                }
            }
        }

        // ── PART 2: Organized by document type ───────────────────────────
        for member in &members {
            // All member images
            if let Some(ref path) = member.image {
                let resolved_path = if path.starts_with('/') {
                    format!(".{}", path)
                } else {
                    format!("./{}", path)
                };
                if Path::new(&resolved_path).exists() {
                    if let Ok(file_content) = std::fs::read(&resolved_path) {
                        let file_ext = Path::new(path)
                            .extension()
                            .and_then(|s| s.to_str())
                            .unwrap_or("jpg");
                        let file_name = format!("All_Member_Pictures/{}_{}.{}",
                            member.name.replace(" ", "_"),
                            member.phone,
                            file_ext
                        );
                        zip.start_file(&file_name, options)?;
                        std::io::Write::write_all(&mut zip, &file_content)?;
                    }
                }
            }

            // All member NIDs
            if let Some(ref path) = member.nid_attachment {
                let resolved_path = if path.starts_with('/') {
                    format!(".{}", path)
                } else {
                    format!("./{}", path)
                };
                if Path::new(&resolved_path).exists() {
                    if let Ok(file_content) = std::fs::read(&resolved_path) {
                        let file_ext = Path::new(path)
                            .extension()
                            .and_then(|s| s.to_str())
                            .unwrap_or("pdf");
                        let file_name = format!("All_Member_NIDs/{}_{}.{}",
                            member.name.replace(" ", "_"),
                            member.phone,
                            file_ext
                        );
                        zip.start_file(&file_name, options)?;
                        std::io::Write::write_all(&mut zip, &file_content)?;
                    }
                }
            }

            // All nominee images
            if let Some(ref path) = member.nominee_image {
                let resolved_path = if path.starts_with('/') {
                    format!(".{}", path)
                } else {
                    format!("./{}", path)
                };
                if Path::new(&resolved_path).exists() {
                    if let Ok(file_content) = std::fs::read(&resolved_path) {
                        let file_ext = Path::new(path)
                            .extension()
                            .and_then(|s| s.to_str())
                            .unwrap_or("jpg");
                        let file_name = format!("All_Nominee_Pictures/{}_nominee_{}.{}",
                            member.name.replace(" ", "_"),
                            member.phone,
                            file_ext
                        );
                        zip.start_file(&file_name, options)?;
                        std::io::Write::write_all(&mut zip, &file_content)?;
                    }
                }
            }

            // All nominee NIDs
            if let Some(ref path) = member.nominee_nid_attachment {
                let resolved_path = if path.starts_with('/') {
                    format!(".{}", path)
                } else {
                    format!("./{}", path)
                };
                if Path::new(&resolved_path).exists() {
                    if let Ok(file_content) = std::fs::read(&resolved_path) {
                        let file_ext = Path::new(path)
                            .extension()
                            .and_then(|s| s.to_str())
                            .unwrap_or("pdf");
                        let file_name = format!("All_Nominee_NIDs/{}_nominee_nid_{}.{}",
                            member.name.replace(" ", "_"),
                            member.phone,
                            file_ext
                        );
                        zip.start_file(&file_name, options)?;
                        std::io::Write::write_all(&mut zip, &file_content)?;
                    }
                }
            }
        }

        zip.finish()?;
    }

    Ok(HttpResponse::Ok()
        .content_type("application/zip")
        .insert_header(("Content-Disposition", "attachment; filename=\"member_attachments.zip\""))
        .body(zip_buffer))
}
