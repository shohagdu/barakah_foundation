#!/bin/bash
# ============================================================
# Barakah Foundation — ONE-SHOT SERVER SETUP
# Upload the entire deploy/ folder to your server, then run:
#   bash ~/deploy/setup.sh
# ============================================================
set -e

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$HOME/app"
LOG_DIR="$HOME/logs"
WEB_DIR="$HOME/public_html/barakah_foundation"
SUBFOLDER="barakah_foundation"

echo "============================================"
echo " Barakah Foundation — Server Setup"
echo "============================================"
echo " Deploy dir : $DEPLOY_DIR"
echo " App dir    : $APP_DIR"
echo " Web dir    : $WEB_DIR"
echo "============================================"
echo ""

# ── Verify binary exists ─────────────────────────────────────
if [ ! -f "$DEPLOY_DIR/dist/bmf-backend" ]; then
    echo " ERROR: dist/bmf-backend not found in $DEPLOY_DIR"
    echo " Make sure you uploaded the full deploy/ folder including dist/"
    exit 1
fi

# ── Create directories ───────────────────────────────────────
echo "[1/6] Creating directories..."
mkdir -p "$APP_DIR" "$LOG_DIR" "$WEB_DIR"
echo "      done"

# ── Configure .env ───────────────────────────────────────────
echo ""
echo "[2/6] Configuring environment (.env)..."

if [ -f "$APP_DIR/.env" ]; then
    echo "      .env already exists — skipping (delete ~/app/.env to reconfigure)"
else
    echo ""
    echo "  Enter your cPanel database details:"
    echo "  (Find these in cPanel → MySQL Databases)"
    echo ""

    read -rp "  DB Host     [localhost]: " DB_HOST
    DB_HOST="${DB_HOST:-localhost}"

    read -rp "  DB Port     [3306]: " DB_PORT
    DB_PORT="${DB_PORT:-3306}"

    read -rp "  DB Name     : " DB_NAME
    while [ -z "$DB_NAME" ]; do
        read -rp "  DB Name (required): " DB_NAME
    done

    read -rp "  DB User     : " DB_USER
    while [ -z "$DB_USER" ]; do
        read -rp "  DB User (required): " DB_USER
    done

    read -rsp "  DB Password : " DB_PASS
    echo ""
    while [ -z "$DB_PASS" ]; do
        read -rsp "  DB Password (required): " DB_PASS
        echo ""
    done

    read -rp "  Backend Port [8080]: " BACKEND_PORT
    BACKEND_PORT="${BACKEND_PORT:-8080}"

    # Generate a random JWT secret
    JWT_SECRET=$(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 48)

    cat > "$APP_DIR/.env" <<EOF
DATABASE_URL=mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}
HOST=127.0.0.1
PORT=${BACKEND_PORT}
JWT_SECRET=${JWT_SECRET}
RUST_LOG=info
EOF

    echo "      .env created at $APP_DIR/.env"
fi

# Read PORT from .env for later use
BACKEND_PORT=$(grep "^PORT" "$APP_DIR/.env" | cut -d'=' -f2 | tr -d '[:space:]')
BACKEND_PORT="${BACKEND_PORT:-8080}"

# ── Copy binary and scripts ──────────────────────────────────
echo ""
echo "[3/6] Installing backend binary and scripts..."
cp "$DEPLOY_DIR/dist/bmf-backend" "$APP_DIR/bmf-backend"
cp "$DEPLOY_DIR/start.sh"   "$APP_DIR/start.sh"
cp "$DEPLOY_DIR/stop.sh"    "$APP_DIR/stop.sh"
cp "$DEPLOY_DIR/restart.sh" "$APP_DIR/restart.sh"

chmod +x "$APP_DIR/bmf-backend"
chmod +x "$APP_DIR/start.sh" "$APP_DIR/stop.sh" "$APP_DIR/restart.sh"
echo "      done"

# ── Deploy frontend ──────────────────────────────────────────
echo ""
echo "[4/6] Deploying frontend to $WEB_DIR ..."
cp -r "$DEPLOY_DIR/dist/public_html/." "$WEB_DIR/"
cp "$DEPLOY_DIR/public_html/.htaccess" "$WEB_DIR/.htaccess"
echo "      done"

# ── Import database schema ───────────────────────────────────
echo ""
echo "[5/6] Importing database schema..."

if [ -f "$DEPLOY_DIR/schema.sql" ]; then
    # Parse DB credentials from .env
    DB_URL=$(grep "^DATABASE_URL" "$APP_DIR/.env" | cut -d'=' -f2-)
    _DB_USER=$(echo "$DB_URL" | sed 's|mysql://||' | cut -d':' -f1)
    _DB_PASS=$(echo "$DB_URL" | sed 's|mysql://[^:]*:||' | cut -d'@' -f1)
    _DB_HOST=$(echo "$DB_URL" | cut -d'@' -f2 | cut -d':' -f1)
    _DB_PORT=$(echo "$DB_URL" | cut -d'@' -f2 | cut -d':' -f2 | cut -d'/' -f1)
    _DB_NAME=$(echo "$DB_URL" | rev | cut -d'/' -f1 | rev)

    mysql -h "$_DB_HOST" -P "$_DB_PORT" -u "$_DB_USER" -p"$_DB_PASS" "$_DB_NAME" \
        < "$DEPLOY_DIR/schema.sql" \
        && echo "      Schema imported successfully" \
        || echo "      WARNING: Schema import had errors (tables may already exist — this is OK)"
else
    echo "      WARNING: schema.sql not found — skipping"
fi

# ── Start backend ────────────────────────────────────────────
echo ""
echo "[6/6] Starting backend..."

# Stop any existing instance first
if [ -f "$APP_DIR/bmf.pid" ] && kill -0 "$(cat "$APP_DIR/bmf.pid")" 2>/dev/null; then
    echo "      Stopping existing backend..."
    kill "$(cat "$APP_DIR/bmf.pid")" 2>/dev/null || true
    rm -f "$APP_DIR/bmf.pid"
    sleep 1
fi

bash "$APP_DIR/start.sh"

sleep 2

if curl -sf "http://127.0.0.1:${BACKEND_PORT}/api/health" > /dev/null 2>&1; then
    echo "      Backend is running and healthy!"
else
    echo "      Backend started — health check pending (may take a few seconds)"
    echo "      Check logs: tail -50 $LOG_DIR/bmf.log"
fi

# ── Add cron job ─────────────────────────────────────────────
echo ""
echo "      Adding cron job to auto-restart backend if it crashes..."
CRON_CMD="*/5 * * * * pgrep -f bmf-backend > /dev/null || bash $APP_DIR/start.sh >> $LOG_DIR/cron.log 2>&1"
# Add only if not already present
( crontab -l 2>/dev/null | grep -v "bmf-backend"; echo "$CRON_CMD" ) | crontab -
echo "      Cron job added"

# ── Done ─────────────────────────────────────────────────────
echo ""
echo "============================================"
echo " SETUP COMPLETE"
echo "============================================"
echo ""
echo " Site URL   : https://shohozit.com/$SUBFOLDER/"
echo " API health : curl http://127.0.0.1:${BACKEND_PORT}/api/health"
echo " Logs       : tail -f $LOG_DIR/bmf.log"
echo ""
echo " Default login:"
echo "   Email   : admin@barakah.org"
echo "   Password: Admin@1234  (change after first login!)"
echo ""
echo " Manage backend:"
echo "   Start  : bash $APP_DIR/start.sh"
echo "   Stop   : bash $APP_DIR/stop.sh"
echo "   Restart: bash $APP_DIR/restart.sh"
echo "============================================"
