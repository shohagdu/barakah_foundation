use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

// ──────────────────────────────────────────────
// Member
// ──────────────────────────────────────────────
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Member {
    pub id:         i64,
    pub name:       String,
    pub phone:      String,
    pub email:      Option<String>,
    pub address:    Option<String>,
    pub category:   Option<String>,
    pub status:     Option<String>,
    pub join_date:  Option<NaiveDate>,
    pub fee:        Option<Decimal>,
    pub notes:      Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MemberPayload {
    pub name:       String,
    pub phone:      String,
    pub email:      Option<String>,
    pub address:    Option<String>,
    pub category:   Option<String>,
    pub status:     Option<String>,
    #[serde(rename = "joinDate")]
    pub join_date:  Option<NaiveDate>,
    pub fee:        Option<Decimal>,
    pub notes:      Option<String>,
}

// ──────────────────────────────────────────────
// Account
// ──────────────────────────────────────────────
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Account {
    pub id:          i64,
    pub date:        NaiveDate,
    #[serde(rename = "txType")]
    pub tx_type:     Option<String>,
    pub category:    Option<String>,
    pub description: String,
    pub amount:      Decimal,
    pub notes:       Option<String>,
}
//
// #[derive(Debug, Deserialize)]
// pub struct AccountPayload {
//     pub date:        NaiveDate,
//     pub memberId:     String,
//     pub bankAccountId:     String,
//     pub collectionYear:     String,
//     pub amount:      Decimal,
//     pub notes:       Option<String>,
// }

// ──────────────────────────────────────────────
// Donation
// ──────────────────────────────────────────────
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Donation {
    pub id:         i64,
    pub donor:      String,
    pub phone:      Option<String>,
    pub address:    Option<String>,
    pub amount:     Decimal,
    pub date:       NaiveDate,
    #[serde(rename = "donType")]
    pub don_type:   Option<String>,
    pub project_id: Option<i64>,
    pub notes:      Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DonationPayload {
    pub donor:      String,
    pub phone:      Option<String>,
    pub address:    Option<String>,
    pub amount:     Decimal,
    pub date:       NaiveDate,
    #[serde(rename = "type")]
    pub don_type:   Option<String>,
    #[serde(rename = "projectId")]
    pub project_id: Option<i64>,
    pub notes:      Option<String>,
}

// ──────────────────────────────────────────────
// Project
// ──────────────────────────────────────────────
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Project {
    pub id:          i64,
    pub name:        String,
    pub description: Option<String>,
    pub budget:      Option<Decimal>,
    pub spent:       Option<Decimal>,
    pub status:      Option<String>,
    pub start_date:  Option<NaiveDate>,
    pub end_date:    Option<NaiveDate>,
}

#[derive(Debug, Deserialize)]
pub struct ProjectPayload {
    pub name:        String,
    pub description: Option<String>,
    pub budget:      Option<Decimal>,
    pub spent:       Option<Decimal>,
    pub status:      Option<String>,
    #[serde(rename = "startDate")]
    pub start_date:  Option<NaiveDate>,
    #[serde(rename = "endDate")]
    pub end_date:    Option<NaiveDate>,
}

// ──────────────────────────────────────────────
// Beneficiary
// ──────────────────────────────────────────────
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Beneficiary {
    pub id:          i64,
    pub name:        String,
    pub phone:       Option<String>,
    pub address:     Option<String>,
    pub category:    Option<String>,
    pub status:      Option<String>,
    pub monthly_aid: Option<Decimal>,
    pub join_date:   Option<NaiveDate>,
    pub notes:       Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BeneficiaryPayload {
    pub name:        String,
    pub phone:       Option<String>,
    pub address:     Option<String>,
    pub category:    Option<String>,
    pub status:      Option<String>,
    #[serde(rename = "monthlyAid")]
    pub monthly_aid: Option<Decimal>,
    #[serde(rename = "joinDate")]
    pub join_date:   Option<NaiveDate>,
    pub notes:       Option<String>,
}

// ──────────────────────────────────────────────
// Meeting
// ──────────────────────────────────────────────
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Meeting {
    pub id:        i64,
    pub title:     String,
    pub date:      NaiveDate,
    // TIME_FORMAT(...) in SQL → String
    pub time:      Option<String>,
    pub venue:     Option<String>,
    #[serde(rename = "mtType")]
    pub mt_type:   Option<String>,
    pub status:    Option<String>,
    pub attendees: Option<String>,
    pub agenda:    Option<String>,
    pub minutes:   Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MeetingPayload {
    pub title:     String,
    pub date:      NaiveDate,
    pub time:      Option<String>,
    pub venue:     Option<String>,
    #[serde(rename = "type")]
    pub mt_type:   Option<String>,
    pub status:    Option<String>,
    pub attendees: Option<String>,
    pub agenda:    Option<String>,
    pub minutes:   Option<String>,
}

// ──────────────────────────────────────────────
// Query Params
// ──────────────────────────────────────────────
#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub search:      Option<String>,
    #[serde(rename = "type")]
    pub filter_type: Option<String>,
}
