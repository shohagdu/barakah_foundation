#!/bin/bash
# ============================================================
# STEP 3 — SERVER SETUP SCRIPT
# Run this ON THE SERVER after uploading via 2_upload.sh
# SSH in first, then: bash ~/app/3_server_setup.sh
# ============================================================
set -e

APP_DIR="$HOME/app"
LOG_DIR="$HOME/logs"

echo "============================================"
echo " Barakah Foundation — Server Setup"
echo " Deploy: public_html/barakah_foundation/"
echo "============================================"

# ── Check .env exists ────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
    echo ""
    echo " ERROR: $APP_DIR/.env not found!"
    echo ""
    echo " Create it now:"
    echo "   nano $APP_DIR/.env"
    echo ""
    echo " Paste and fill in:"
    echo "   DATABASE_URL=mysql://db_user:db_pass@localhost:3306/db_name"
    echo "   HOST=127.0.0.1"
    echo "   PORT=8080"
    echo "   JWT_SECRET=your_long_random_secret_here"
    echo "   RUST_LOG=info"
    exit 1
fi

echo ""
echo "[1/4] Setting permissions..."
chmod +x "$APP_DIR/bmf-backend"
chmod +x "$APP_DIR/start.sh"
chmod +x "$APP_DIR/stop.sh"
chmod +x "$APP_DIR/restart.sh"
mkdir -p "$LOG_DIR"

echo "[2/4] Importing database schema..."

# Parse DATABASE_URL from .env
DB_URL=$(grep "^DATABASE_URL" "$APP_DIR/.env" | cut -d'=' -f2-)
DB_USER=$(echo "$DB_URL" | sed 's|mysql://||' | cut -d':' -f1)
DB_PASS=$(echo "$DB_URL" | sed 's|mysql://[^:]*:||' | cut -d'@' -f1)
DB_HOST=$(echo "$DB_URL" | cut -d'@' -f2 | cut -d':' -f1)
DB_PORT=$(echo "$DB_URL" | cut -d'@' -f2 | cut -d':' -f2 | cut -d'/' -f1)
DB_NAME=$(echo "$DB_URL" | rev | cut -d'/' -f1 | rev)

echo "      Host: $DB_HOST:$DB_PORT  DB: $DB_NAME"

if [ -f "$HOME/schema.sql" ]; then
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$HOME/schema.sql" \
        && echo "      ✓ Schema imported successfully" \
        || echo "      WARNING: Schema import had errors (tables may already exist)"
else
    echo "      WARNING: schema.sql not found at ~/schema.sql — skipping"
fi

echo "[3/4] Starting backend..."
bash "$APP_DIR/start.sh"

echo "[4/4] Verifying health check..."
sleep 2
if curl -sf http://127.0.0.1:8080/api/health > /dev/null; then
    echo "      ✓ Backend is running and healthy!"
else
    echo "      WARNING: Health check failed. Check logs:"
    echo "      tail -50 $LOG_DIR/bmf.log"
fi

echo ""
echo "============================================"
echo " SETUP COMPLETE"
echo "============================================"
echo ""
echo " Site URL  : https://shohozit.com/barakah_foundation/"
echo " API health: curl http://127.0.0.1:8080/api/health"
echo ""
echo " Manage backend:"
echo "   Start  : bash ~/app/start.sh"
echo "   Stop   : bash ~/app/stop.sh"
echo "   Restart: bash ~/app/restart.sh"
echo "   Logs   : tail -f ~/logs/bmf.log"
echo ""
echo " Add this cron in cPanel to auto-restart if backend crashes:"
echo "   */5 * * * * pgrep -f bmf-backend > /dev/null || bash $APP_DIR/start.sh"
echo "============================================"
