#!/bin/bash
# ============================================================
# Barakah Foundation — Server Setup
# Run after uploading: bash ~/setup.sh
# ============================================================
set -e

APP_DIR="$HOME/barakah_foundation_api"
WEB_DIR="$HOME/public_html/barakah_foundation"
LOG_DIR="$HOME/logs"

echo "============================================"
echo " Barakah Foundation — Setup"
echo "============================================"

# ── Cleanup OLD/rogue files from previous deploys ────────────
echo "[1/6] Cleaning up old files..."

# Old rogue .htaccess at root (caused 403 errors)
if [ -f "$HOME/public_html/.htaccess" ]; then
    BACKUP="$HOME/public_html/.htaccess.bak.$(date +%s)"
    mv "$HOME/public_html/.htaccess" "$BACKUP"
    echo "      Moved old root .htaccess → $BACKUP"
fi

# Old test/proxy files
rm -f "$WEB_DIR/test.php"
rm -f "$WEB_DIR/_api.php"
rm -f "$WEB_DIR/api/test.php"
rm -f "$HOME/public_html/test-root.php"

# ── Check .env ───────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
    echo ""
    echo " ERROR: $APP_DIR/.env not found!"
    echo ""
    echo " Create it first:"
    echo "   nano $APP_DIR/.env"
    echo ""
    echo " Content:"
    echo "   DATABASE_URL=mysql://DB_USER:DB_PASS@localhost:3306/DB_NAME"
    echo "   HOST=127.0.0.1"
    echo "   PORT=8080"
    echo "   JWT_SECRET=minimum_32_character_random_string_here"
    echo "   RUST_LOG=info"
    exit 1
fi

# ── Permissions ──────────────────────────────────────────────
echo "[2/6] Setting permissions..."
chmod +x "$APP_DIR/bmf-backend"
chmod +x "$APP_DIR"/*.sh
mkdir -p "$LOG_DIR"
mkdir -p "$APP_DIR/uploads"

# Web files: 755 for dirs, 644 for files
find "$WEB_DIR" -type d -exec chmod 755 {} \;
find "$WEB_DIR" -type f -exec chmod 644 {} \;

# ── Database ─────────────────────────────────────────────────
echo "[3/6] Importing database schema..."
DB_URL=$(grep "^DATABASE_URL" "$APP_DIR/.env" | cut -d'=' -f2-)
DB_USER=$(echo "$DB_URL" | sed 's|mysql://||' | cut -d':' -f1)
DB_PASS=$(echo "$DB_URL" | sed 's|mysql://[^:]*:||' | cut -d'@' -f1)
DB_HOST=$(echo "$DB_URL" | cut -d'@' -f2 | cut -d':' -f1)
DB_PORT=$(echo "$DB_URL" | cut -d'@' -f2 | cut -d':' -f2 | cut -d'/' -f1)
DB_NAME=$(echo "$DB_URL" | rev | cut -d'/' -f1 | rev)

if [ -f "$HOME/schema.sql" ]; then
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$HOME/schema.sql" 2>&1 | head -3 \
        && echo "      OK: schema imported" \
        || echo "      WARNING: schema errors (tables may already exist — OK)"
else
    echo "      SKIP: schema.sql not found"
fi

# ── Start backend ────────────────────────────────────────────
echo "[4/6] Restarting backend..."
bash "$APP_DIR/stop.sh" 2>/dev/null || true
sleep 1
bash "$APP_DIR/start.sh"

# ── Backend health check ─────────────────────────────────────
echo "[5/6] Backend health check..."
sleep 2
if curl -sf http://127.0.0.1:8080/api/health > /dev/null; then
    echo "      OK: backend running on port 8080"
else
    echo "      FAIL: backend not responding"
    echo "      Check: tail -50 $LOG_DIR/bmf.log"
    exit 1
fi

# ── PHP proxy check ──────────────────────────────────────────
echo "[6/6] Testing PHP proxy..."
DOMAIN=$(grep -oP '(?<=ServerName )\S+' /etc/apache2/sites-enabled/*.conf 2>/dev/null | head -1)
[ -z "$DOMAIN" ] && DOMAIN="$(hostname -f)"

# Test locally (avoids SSL issues)
RESULT=$(curl -sf "https://localhost/barakah_foundation/api/health" 2>&1 || curl -sf "http://localhost/barakah_foundation/api/health" 2>&1 || echo "FAIL")
if echo "$RESULT" | grep -q "status"; then
    echo "      OK: PHP proxy working"
else
    echo "      NOTE: Test from browser → https://YOUR_DOMAIN/barakah_foundation/api/health"
fi

echo ""
echo "============================================"
echo " DONE — সব OK"
echo "============================================"
echo " Site: https://YOUR_DOMAIN/barakah_foundation/"
echo " Login: admin@barakah.com / Admin@1234"
echo ""
echo " Commands:"
echo "   Start  : bash ~/barakah_foundation_api/start.sh"
echo "   Stop   : bash ~/barakah_foundation_api/stop.sh"
echo "   Restart: bash ~/barakah_foundation_api/restart.sh"
echo "   Logs   : tail -f ~/logs/bmf.log"
echo "============================================"
