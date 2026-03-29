// ================================================================
// JWT Auth Module
// ================================================================
use actix_web::{dev::ServiceRequest, Error, HttpMessage};
use actix_web_httpauth::extractors::bearer::BearerAuth;
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation, Algorithm};
use serde::{Deserialize, Serialize};
use std::env;

// ── Claims ─────────────────────────────────────────────────
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub:   String,     // user id
    pub email: String,
    pub role:  String,
    pub name:  String,
    pub exp:   i64,        // expiry timestamp
    pub iat:   i64,        // issued at
}

// ── Token Generation ───────────────────────────────────────
pub fn generate_token(
    user_id: i64,
    email:   &str,
    role:    &str,
    name:    &str,
) -> Result<String, jsonwebtoken::errors::Error> {
    let secret  = jwt_secret();
    let now     = Utc::now();
    let exp_hrs: i64 = env::var("JWT_EXPIRES_HOURS")
        .unwrap_or_else(|_| "24".into())
        .parse().unwrap_or(24);

    let claims = Claims {
        sub:   user_id.to_string(),
        email: email.to_string(),
        role:  role.to_string(),
        name:  name.to_string(),
        iat:   now.timestamp(),
        exp:   (now + Duration::hours(exp_hrs)).timestamp(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

// ── Token Verification ─────────────────────────────────────
pub fn verify_token(token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let secret = jwt_secret();
    let result = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::new(Algorithm::HS256),
    )?;
    Ok(result.claims)
}

fn jwt_secret() -> String {
    env::var("JWT_SECRET").unwrap_or_else(|_| "barakah_musharkah_super_secret_key_2024".into())
}

// ── Actix Middleware Validator ─────────────────────────────
pub async fn jwt_validator(
    req:        ServiceRequest,
    credentials: BearerAuth,
) -> Result<ServiceRequest, (Error, ServiceRequest)> {
    match verify_token(credentials.token()) {
        Ok(claims) => {
            req.extensions_mut().insert(claims);
            Ok(req)
        }
        Err(e) => {
            log::warn!("JWT validation failed: {:?}", e);
            Err((
                actix_web::error::ErrorUnauthorized(
                    serde_json::json!({ "error": "Invalid or expired token" }).to_string()
                ),
                req,
            ))
        }
    }
}

// ── Extract Claims from Request ────────────────────────────
pub fn get_claims(req: &actix_web::HttpRequest) -> Option<Claims> {
    req.extensions().get::<Claims>().cloned()
}
