mod db;
mod models;
mod handlers;
mod errors;
mod auth;

use actix_cors::Cors;
use actix_web::{web, App, HttpServer, middleware::Logger};
use actix_web_httpauth::middleware::HttpAuthentication;
use dotenvy::dotenv;
use sqlx::mysql::MySqlPoolOptions;
use std::env;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port: u16 = env::var("PORT").unwrap_or_else(|_| "8080".to_string()).parse().expect("PORT must be a number");

    let pool = MySqlPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to connect to MySQL");

    log::info!("✅ MySQL connected");
    log::info!("🚀 Server → http://{}:{}", host, port);

    let pool_data = web::Data::new(pool);

    HttpServer::new(move || {
        let cors = Cors::default().allow_any_origin().allow_any_method().allow_any_header().max_age(3600);
        let jwt_mw = HttpAuthentication::bearer(auth::jwt_validator);

        App::new()
            .wrap(cors)
            .wrap(Logger::default())
            .app_data(pool_data.clone())
            .app_data(web::JsonConfig::default().error_handler(|err, _| {
                let msg = err.to_string();
                actix_web::error::InternalError::from_response(
                    err,
                    actix_web::HttpResponse::BadRequest().json(serde_json::json!({ "error": msg })),
                ).into()
            }))

            // ── PUBLIC ──────────────────────────────────────────
            .service(
                web::scope("/api/auth")
                    .route("/register", web::post().to(handlers::auth_handler::register))
                    .route("/login",    web::post().to(handlers::auth_handler::login))
            )
            .route("/api/health", web::get().to(handlers::dashboard::health))

            // ── PROTECTED ───────────────────────────────────────
            .service(
                web::scope("/api")
                    .wrap(jwt_mw)

                    // Auth
                    .route("/auth/me",        web::get().to(handlers::auth_handler::me))
                    .route("/auth/users",      web::get().to(handlers::auth_handler::list_users))
                    .route("/auth/users/{id}", web::put().to(handlers::auth_handler::update_user))
                    .route("/auth/users/{id}", web::delete().to(handlers::auth_handler::delete_user))

                    // Dashboard
                    .route("/dashboard", web::get().to(handlers::dashboard::summary))

                    // Members
                    .route("/members",      web::get().to(handlers::members::list))
                    .route("/members",      web::post().to(handlers::members::create))
                    .route("/members/{id}", web::get().to(handlers::members::get_one))
                    .route("/members/{id}", web::put().to(handlers::members::update))
                    .route("/members/{id}", web::delete().to(handlers::members::delete))

                    // Accounts
                    .route("/accounts",             web::get().to(handlers::accounts::list))
                    .route("/accounts",             web::post().to(handlers::accounts::create))
                    .route("/accounts/{id}",        web::put().to(handlers::accounts::update))
                    .route("/accounts/{id}",        web::delete().to(handlers::accounts::delete))
                    .route("/bank-accounts",        web::get().to(handlers::accounts::bank_accounts))
                    //.route("/accounts/collection-summary", web::get().to(handlers::accounts::collection_summary))

                    // Donations
                    .route("/donations",      web::get().to(handlers::donations::list))
                    .route("/donations",      web::post().to(handlers::donations::create))
                    .route("/donations/{id}", web::put().to(handlers::donations::update))
                    .route("/donations/{id}", web::delete().to(handlers::donations::delete))

                    // Projects
                    .route("/projects",      web::get().to(handlers::projects::list))
                    .route("/projects",      web::post().to(handlers::projects::create))
                    .route("/projects/{id}", web::put().to(handlers::projects::update))
                    .route("/projects/{id}", web::delete().to(handlers::projects::delete))

                    // Beneficiaries
                    .route("/beneficiaries",      web::get().to(handlers::beneficiaries::list))
                    .route("/beneficiaries",      web::post().to(handlers::beneficiaries::create))
                    .route("/beneficiaries/{id}", web::put().to(handlers::beneficiaries::update))
                    .route("/beneficiaries/{id}", web::delete().to(handlers::beneficiaries::delete))

                    // Meetings
                    .route("/meetings",      web::get().to(handlers::meetings::list))
                    .route("/meetings",      web::post().to(handlers::meetings::create))
                    .route("/meetings/{id}", web::get().to(handlers::meetings::get_one))
                    .route("/meetings/{id}", web::put().to(handlers::meetings::update))
                    .route("/meetings/{id}", web::delete().to(handlers::meetings::delete))
            )
    })
    .bind((host, port))?
    .run()
    .await
}