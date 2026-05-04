#!/bin/bash

# ============================================================
# Barakah Foundation - cPanel Deployment Setup Script
# Usage: bash cpanel-setup.sh
# ============================================================

set -e  # Exit on error

echo "=========================================="
echo "Barakah Foundation - cPanel Setup"
echo "=========================================="
echo ""

# ============================================================
# 1. Check Prerequisites
# ============================================================
echo "✓ Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "✗ Node.js not found. Please install Node.js v16+:"
    echo "  Contact your hosting provider to install Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "✗ npm not found. Please install npm (comes with Node.js)"
    exit 1
fi

if ! command -v mysql &> /dev/null; then
    echo "⚠ MySQL client not found. You may need to use phpMyAdmin instead."
fi

echo "✓ Node.js: $(node --version)"
echo "✓ npm: $(npm --version)"
echo ""

# ============================================================
# 2. Create Directory Structure
# ============================================================
echo "✓ Setting up directory structure..."

mkdir -p logs
mkdir -p uploads
chmod 755 logs uploads

echo "✓ Created: logs/, uploads/"
echo ""

# ============================================================
# 3. Install Frontend Dependencies
# ============================================================
echo "✓ Installing frontend dependencies..."

cd frontend
npm install --prefer-offline --no-audit

echo "✓ Building frontend for production..."
npm run build

echo "✓ Frontend build complete: dist/"
cd ..
echo ""

# ============================================================
# 4. Configure Environment
# ============================================================
echo "✓ Setting up environment configuration..."

if [ ! -f backend/.env ]; then
    echo "⚠ backend/.env not found. Creating from template..."
    cp deploy/.env.template backend/.env

    echo ""
    echo "!!! IMPORTANT !!!"
    echo "Edit backend/.env with your database credentials:"
    echo "  nano backend/.env"
    echo ""
    echo "Update these values:"
    echo "  DATABASE_URL=mysql://username:password@localhost/barakah_foundation"
    echo "  JWT_SECRET=<generate with: openssl rand -base64 32>"
    echo ""
    read -p "Press Enter after updating backend/.env ..."
fi

echo "✓ Environment configured"
echo ""

# ============================================================
# 5. Setup Database (optional)
# ============================================================
echo ""
echo "✓ Database Setup"
echo "=========================================="
echo ""
echo "Choose how to import database schema:"
echo "  1) cPanel GUI (phpMyAdmin)"
echo "  2) SSH command line"
echo "  3) Skip (I'll do this manually)"
echo ""
read -p "Enter choice (1-3): " db_choice

if [ "$db_choice" = "1" ]; then
    echo ""
    echo "Using cPanel phpMyAdmin:"
    echo "  1. Login to cPanel"
    echo "  2. Go to Databases > phpMyAdmin"
    echo "  3. Create new database: barakah_foundation"
    echo "  4. Click database > Import tab"
    echo "  5. Choose file: deploy/schema.sql"
    echo "  6. Click Import"
    echo "  7. Repeat for: migrations/001_update_member_deposits_status.sql"
    echo ""
    read -p "Press Enter after importing both SQL files..."

elif [ "$db_choice" = "2" ]; then
    echo ""
    echo "Using SSH command line:"
    echo ""
    read -p "Enter MySQL username: " mysql_user

    echo "Importing schema..."
    mysql -u "$mysql_user" -p barakah_foundation < deploy/schema.sql

    echo "Importing migrations..."
    mysql -u "$mysql_user" -p barakah_foundation < migrations/001_update_member_deposits_status.sql

    echo "✓ Database imported successfully"
fi

echo ""

# ============================================================
# 6. Set File Permissions
# ============================================================
echo "✓ Setting file permissions..."

chmod 600 backend/.env
chmod 755 deploy/cpanel-setup.sh
chmod 755 logs
chmod 755 uploads

echo "✓ Permissions configured"
echo ""

# ============================================================
# 7. Verify Configuration
# ============================================================
echo "✓ Verifying configuration..."

if [ ! -f backend/.env ]; then
    echo "✗ ERROR: backend/.env not found!"
    exit 1
fi

if [ ! -d frontend/dist ]; then
    echo "✗ ERROR: frontend/dist not found!"
    exit 1
fi

echo "✓ All configuration files present"
echo ""

# ============================================================
# 8. Display Next Steps
# ============================================================
echo "=========================================="
echo "✓ Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. COPY FRONTEND FILES TO public_html:"
echo "   cp -r frontend/dist/* public_html/"
echo "   cp deploy/public_html/.htaccess public_html/"
echo "   cp deploy/uploads/.htaccess uploads/"
echo ""
echo "2. VERIFY BACKEND:"
echo "   cat backend/.env"
echo ""
echo "3. START BACKEND (choose one):"
echo ""
echo "   Option A - Direct (if Rust compiled):"
echo "   cd backend && ./target/release/barakah_foundation &"
echo ""
echo "   Option B - Node.js wrapper:"
echo "   node server.js &"
echo ""
echo "   Option C - Using PM2:"
echo "   npm install -g pm2"
echo "   pm2 start ecosystem.config.js"
echo ""
echo "4. TEST YOUR APPLICATION:"
echo "   https://yourdomain.com"
echo ""
echo "5. CHANGE DEFAULT ADMIN PASSWORD:"
echo "   Email: admin@barakah.org"
echo "   Password: Admin@1234 (temporary!)"
echo ""
echo "=========================================="
echo "Documentation:"
echo "  - Backend: BACKEND.md"
echo "  - Frontend: FRONTEND.md"
echo "  - Deployment: deploy/DEPLOY_INSTRUCTIONS.md"
echo ""
echo "Support:"
echo "  Check logs: tail -f logs/backend.log"
echo "=========================================="
echo ""
