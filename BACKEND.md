# Backend Documentation — Barakah Foundation

## Overview

The backend is built with **Rust** using the **Actix-web** framework with MySQL database for persistent storage. It provides RESTful API endpoints with JWT authentication and role-based access control.

## Technology Stack

- **Language**: Rust
- **Web Framework**: Actix-web 4.x
- **Database**: MySQL with SQLx (async/compile-time checked queries)
- **Authentication**: JWT (Bearer token)
- **Password Hashing**: bcrypt
- **JSON**: serde + serde_json
- **Decimal**: rust_decimal (for financial calculations)
- **Dates**: chrono

## Project Structure

```
backend/
├── src/
│   ├── main.rs           # Server setup, routes, middleware
│   ├── auth.rs           # JWT validation, token extraction
│   ├── errors.rs         # Custom error types and handling
│   ├── models.rs         # Request/response structs
│   ├── db.rs             # Database utilities
│   └── handlers/
│       ├── mod.rs        # Module exports
│       ├── auth_handler.rs       # User registration, login, profile
│       ├── accounts.rs           # Collection entries (deposits)
│       ├── members.rs            # Member CRUD + attachments
│       ├── dashboard.rs          # Summary statistics
│       ├── reports.rs            # Financial reports
│       ├── settings.rs           # Chart of accounts, bank accounts
│       ├── deposits.rs           # Member deposit summaries
│       ├── collections.rs        # Ad-hoc collections
│       ├── expenses.rs           # Expense management
│       ├── fines.rs              # Member fines
│       ├── upload.rs             # File upload handling
│       ├── donations.rs          # Donation tracking
│       ├── projects.rs           # Project management
│       ├── beneficiaries.rs      # Beneficiary management
│       └── meetings.rs           # Meeting records
├── Cargo.toml
├── Cargo.lock
└── .env                  # Environment variables
```

## Database Schema

### Core Tables

#### users
Stores user accounts with role-based access control.

```sql
CREATE TABLE `users` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,  -- bcrypt hash
    `mobile` VARCHAR(20),
    `role` ENUM('admin','accountant','member','viewer') DEFAULT 'member',
    `status` ENUM('active','inactive','suspended') DEFAULT 'active',
    `last_login` DATETIME,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### members
Member information and profile data.

```sql
CREATE TABLE `members` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `name_eng` VARCHAR(100),
    `phone` VARCHAR(20) NOT NULL,
    `address` TEXT,
    `category` VARCHAR(50),
    `status` VARCHAR(20) DEFAULT 'active',
    `join_date` DATE,
    `fee` DECIMAL(10,2),
    `nid_number` VARCHAR(50),
    `nid_attachment` VARCHAR(255),
    `image` VARCHAR(255),
    `nominee_name` VARCHAR(100),
    `nominee_mobile` VARCHAR(20),
    `nominee_nid_attachment` VARCHAR(255),
    `nominee_image` VARCHAR(255),
    `nominee_address` TEXT,
    `notes` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### member_deposits
Monthly collection entries (چاندا) from members.

```sql
CREATE TABLE `member_deposits` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
    `member_id` BIGINT NOT NULL,
    `transaction_id` BIGINT,
    `deposit_month` VARCHAR(7),  -- "2026-03"
    `deposit_date` DATE NOT NULL,
    `amount` DECIMAL(10,2) NOT NULL,
    `status` ENUM('paid','unpaid','partial','pending','approved') DEFAULT 'paid',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL
);
```

**Status Values**:
- `paid`: Payment confirmed
- `unpaid`: Not yet paid
- `partial`: Partially paid
- `pending`: Awaiting admin approval (member submission)
- `approved`: Admin approved

#### accounts (Chart of Accounts)
General ledger accounts for double-entry bookkeeping.

```sql
CREATE TABLE `accounts` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
    `account_code` VARCHAR(50),
    `type` ENUM('asset','liability','equity','income','expense'),
    `category` VARCHAR(100),
    `description` TEXT,
    `status` ENUM('pending','approved') DEFAULT 'pending',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Status Values**:
- `pending`: Awaiting approval (new account)
- `approved`: Active in reports

#### transactions & transaction_lines
Double-entry bookkeeping implementation.

```sql
CREATE TABLE `transactions` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
    `bank_account_id` BIGINT,
    `txn_date` DATE NOT NULL,
    `description` TEXT,
    `reference` VARCHAR(100),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `transaction_lines` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
    `transaction_id` BIGINT NOT NULL,
    `account_id` BIGINT NOT NULL,
    `debit` DECIMAL(12,2) DEFAULT 0,
    `credit` DECIMAL(12,2) DEFAULT 0,
    FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`)
);
```

#### bank_accounts
Bank account details for deposits.

```sql
CREATE TABLE `bank_accounts` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
    `bank_name` VARCHAR(100),
    `account_name` VARCHAR(100),
    `account_number` VARCHAR(50),
    `branch_name` VARCHAR(100),
    `routing_number` VARCHAR(50),
    `is_active` BOOLEAN DEFAULT 1,
    `is_deleted` BOOLEAN DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### expense_categories
Categories for expense tracking.

```sql
CREATE TABLE `expense_categories` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `nameBn` VARCHAR(100),
    `isActive` BOOLEAN DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### expenses
Expense records with approval workflow.

```sql
CREATE TABLE `expenses` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
    `category_id` BIGINT,
    `amount` DECIMAL(10,2) NOT NULL,
    `description` TEXT,
    `expense_date` DATE NOT NULL,
    `payment_method` VARCHAR(50),
    `reference_number` VARCHAR(100),
    `status` ENUM('draft','pending','approved','rejected') DEFAULT 'draft',
    `rejection_reason` TEXT,
    `created_by` BIGINT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`),
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
);
```

#### member_fines
Fines and penalties for members.

```sql
CREATE TABLE `member_fines` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
    `member_id` BIGINT NOT NULL,
    `amount` DECIMAL(10,2) NOT NULL,
    `reason` TEXT,
    `fine_date` DATE NOT NULL,
    `paid_date` DATE,
    `status` ENUM('pending','paid') DEFAULT 'pending',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
);
```

## API Endpoints

### Authentication
```
POST   /api/auth/register      Register new user
POST   /api/auth/login         Login (returns JWT token)
GET    /api/auth/me            Get logged-in user profile
GET    /api/users              List all users (admin only)
PUT    /api/users/{id}         Update user (admin only)
DELETE /api/users/{id}         Delete user (admin only)
GET    /api/health             Health check (public)
```

### Members
```
GET    /api/members            List members
POST   /api/members            Create member
GET    /api/members/{id}       Get member details
PUT    /api/members/{id}       Update member
DELETE /api/members/{id}       Delete member
GET    /api/members/download/attachments  Download all member files as ZIP
```

### Accounts (Collections)
```
GET    /api/accounts           List collection entries (filtered by member if member role)
POST   /api/accounts           Create collection entry
PUT    /api/accounts/{id}      Update collection entry
DELETE /api/accounts/{id}      Delete collection entry
POST   /api/accounts/{id}/approve  Approve pending collection (admin only)
GET    /api/bank-accounts      List bank accounts
```

### Chart of Accounts
```
GET    /api/settings/chart-of-accounts           List accounts
POST   /api/settings/chart-of-accounts           Create account
PUT    /api/settings/chart-of-accounts/{id}      Update account
DELETE /api/settings/chart-of-accounts/{id}      Delete account
POST   /api/settings/chart-of-accounts/{id}/approve  Approve account (admin only)
```

### Bank Accounts (Settings)
```
GET    /api/settings/bank-accounts           List bank accounts
POST   /api/settings/bank-accounts           Create bank account
PUT    /api/settings/bank-accounts/{id}      Update bank account
DELETE /api/settings/bank-accounts/{id}      Soft delete bank account
```

### Deposits & Member Reports
```
GET    /api/member-deposits/summary         Summary of member deposits
GET    /api/member-deposits/unpaid          List unpaid deposits
GET    /api/member-report                   Member deposit report
GET    /api/member-wise-report              Member-wise collection report
GET    /api/member-fines                    List member fines
POST   /api/member-fines                    Create fine
PUT    /api/member-fines/{id}/pay          Mark fine as paid
```

### Collections (Ad-hoc)
```
GET    /api/collections           List special collections
POST   /api/collections           Create collection
DELETE /api/collections/{id}      Delete collection
```

### Reports
```
GET    /api/reports/profit-loss       Profit & Loss report
GET    /api/reports/cash-flow         Cash Flow report
GET    /api/reports/balance-sheet     Balance Sheet
GET    /api/reports/trial-balance     Trial Balance
GET    /api/reports/bank-statement    Bank statement
GET    /api/reports/expense-summary   Expense summary by category
GET    /api/reports/expense-detail    Expense detail report
```

### Expenses
```
GET    /api/expenses                      List expenses
POST   /api/expenses                      Create expense
GET    /api/expenses/{id}                 Get expense details
PUT    /api/expenses/{id}                 Update expense
DELETE /api/expenses/{id}                 Delete expense
POST   /api/expenses/{id}/approve        Approve expense (admin)
POST   /api/expenses/{id}/reject         Reject expense (admin)
GET    /api/expenses/summary              Expense summary
GET    /api/expense-categories            List categories
POST   /api/expense-categories            Create category
PUT    /api/expense-categories/{id}       Update category
DELETE /api/expense-categories/{id}       Delete category
```

### Other Modules
```
GET    /api/donations                     List donations
POST   /api/donations                     Create donation
PUT    /api/donations/{id}                Update donation
DELETE /api/donations/{id}                Delete donation

GET    /api/projects                      List projects
POST   /api/projects                      Create project
PUT    /api/projects/{id}                 Update project
DELETE /api/projects/{id}                 Delete project

GET    /api/beneficiaries                 List beneficiaries
POST   /api/beneficiaries                 Create beneficiary
PUT    /api/beneficiaries/{id}            Update beneficiary
DELETE /api/beneficiaries/{id}            Delete beneficiary

GET    /api/meetings                      List meetings
POST   /api/meetings                      Create meeting
GET    /api/meetings/{id}                 Get meeting details
PUT    /api/meetings/{id}                 Update meeting
DELETE /api/meetings/{id}                 Delete meeting

POST   /api/upload                        Upload file
```

## Role-Based Access Control (RBAC)

### Roles
1. **admin**: Full access, can approve/reject submissions
2. **accountant**: Can create/edit records, view reports
3. **member**: Limited to own records, can submit entries for approval
4. **viewer**: Read-only access to reports

### Route Protection
```rust
// All routes under /api are protected with JWT middleware
.service(
    web::scope("/api")
        .wrap(jwt_mw)  // Requires valid JWT token
        .route(...)
)

// Public routes (no JWT required)
.route("/api/auth/register", web::post())
.route("/api/auth/login", web::post())
.route("/api/health", web::get())
```

## Authentication Flow

### JWT Token Structure
```json
{
  "sub": "user_id",
  "name": "User Name",
  "email": "user@example.com",
  "role": "member",
  "exp": 1234567890
}
```

### Login Flow
1. Client sends `POST /api/auth/login` with email/password
2. Backend validates credentials (bcrypt comparison)
3. Backend generates JWT token (valid for 24 hours)
4. Client stores token (localStorage or memory)
5. Client includes token in all subsequent requests: `Authorization: Bearer <token>`

### Token Validation
```rust
pub async fn jwt_validator(
    req: ServiceRequest,
    _srv: web::Data<Box<dyn Service<...>>>,
) -> Result<ServiceRequest, Error> {
    // Extract Bearer token from header
    // Decode JWT (verify signature, check expiration)
    // Extract user info from token
    // Attach to request extensions
}
```

## Error Handling

Custom error types with appropriate HTTP status codes:

```rust
pub enum AppError {
    BadRequest(String),      // 400
    Unauthorized(String),    // 401
    Forbidden(String),       // 403
    NotFound(String),        // 404
    Conflict(String),        // 409
    Internal(String),        // 500
}

// Automatic HTTP response conversion
impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        match self {
            AppError::BadRequest(msg) => HttpResponse::BadRequest()
                .json(json!({"error": msg})),
            // ...
        }
    }
}
```

## Key Features

### 1. Double-Entry Bookkeeping
Every transaction creates matching debit and credit entries:
- Debit: Cash/Bank account
- Credit: Liability/Income account

```rust
// Example: Member deposit
// DR Bank (account_id=2)    ৳100
// CR Member Fund (account_id=3)  ৳100
```

### 2. Member Collection Approval Workflow
**Member submits entry**:
- `POST /api/accounts` with `status='pending'` (auto-set for members)
- Entry is created but not included in financial reports

**Admin approves**:
- `POST /api/accounts/{id}/approve`
- Status changes from `pending` to `approved`
- Entry becomes visible in reports

### 3. Chart of Accounts Approval
**Process**:
1. User creates account with `status='pending'`
2. Account appears in settings but not in reports
3. Admin reviews and `POST /api/settings/chart-of-accounts/{id}/approve`
4. Status changes to `approved`, included in all reports

**Report Filtering**:
```sql
WHERE a.status = 'approved'  -- Only approved accounts
```

### 4. File Upload & Attachments
- Supports member documents: NID, photos, nominee info
- Stores in `uploads/` directory
- Returns relative paths in database
- ZIP download: combines member files with organized folder structure

```rust
pub async fn download_all_attachments() -> Result<HttpResponse, AppError> {
    // Create ZIP with dual structure:
    // - Member_Wise/Member_{id}_{name}_{phone}/
    // - All_Member_Pictures/, All_Member_NIDs/, etc.
}
```

## Development Setup

### Prerequisites
- Rust 1.70+
- MySQL 5.7+
- .env file with configuration

### Environment Variables
```env
DATABASE_URL=mysql://user:password@localhost/barakah_foundation
HOST=127.0.0.1
PORT=8080
JWT_SECRET=your_secret_key_here
LOG_LEVEL=info
```

### Build & Run
```bash
cd backend
cargo build --release
cargo run
```

### Database Setup
```bash
mysql -u root -p < deploy/schema.sql
mysql -u root -p < migrations/001_update_member_deposits_status.sql
```

## Dependencies

Key crates in `Cargo.toml`:
- `actix-web`: Web framework
- `tokio`: Async runtime
- `sqlx`: SQL toolkit with compile-time checks
- `serde`: Serialization
- `chrono`: Date/time handling
- `rust_decimal`: Decimal arithmetic
- `bcrypt`: Password hashing
- `jsonwebtoken`: JWT handling
- `zip`: ZIP file creation
- `log`, `env_logger`: Logging

## Query Patterns

### Compile-Time Checked Queries
```rust
// ✅ Type-safe, compile-time checked
let (count,): (i64,) = sqlx::query_as(
    "SELECT COUNT(*) FROM members"
).fetch_one(db).await?;

// ❌ Avoid: Runtime errors possible
let rows = sqlx::query("SELECT * FROM members")
    .fetch_all(db).await?;
```

### Dynamic Queries
```rust
// Use QueryBuilder for dynamic WHERE clauses
let mut q = sqlx::QueryBuilder::new("SELECT * FROM members WHERE ");
if let Some(s) = search {
    q.push("name LIKE ").push_bind(format!("%{}%", s));
}
let rows = q.build_query_as().fetch_all(db).await?;
```

## Performance Considerations

1. **Indexes**: All foreign keys and frequently filtered columns
2. **Decimal**: Use `DECIMAL(12,2)` for financial data (no floating-point errors)
3. **Date Range Queries**: Use `BETWEEN` with parameterized bindings
4. **ZIP Generation**: Streams files from disk, doesn't load all into memory

## Security

1. **JWT**: Tokens expire after 24 hours
2. **Password**: Bcrypt with default cost (12 rounds)
3. **SQL Injection**: All queries use parameterized bindings
4. **CORS**: Configurable from environment
5. **File Upload**: Validates file types and size limits

## Deployment

Build and run with:
```bash
cargo build --release
./target/release/barakah_foundation
```

Or use Docker:
```bash
docker build -t barakah-backend .
docker run -p 8080:8080 --env-file .env barakah-backend
```
