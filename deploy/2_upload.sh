#!/bin/bash
# ============================================================
# STEP 2 — UPLOAD TO CPANEL SERVER
# Run on LOCAL machine after ./1_build.sh
# Edit the CONFIG section below before running
# ============================================================
set -e

# ── CONFIG — Edit these ──────────────────────────────────────
SERVER_USER="shohozit"       # your cPanel username
SERVER_HOST="shohozit.com"          # your server hostname
SERVER_PORT="22"                    # SSH port (usually 22)
SUBFOLDER="barakah_foundation"      # folder inside public_html
# ─────────────────────────────────────────────────────────────

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$DEPLOY_DIR/dist"
REMOTE_HOME="/home/$SERVER_USER"
REMOTE_APP="$REMOTE_HOME/app"
REMOTE_WEB="$REMOTE_HOME/public_html/$SUBFOLDER"

echo "============================================"
echo " Uploading to: $SERVER_USER@$SERVER_HOST"
echo " Web path    : public_html/$SUBFOLDER/"
echo "============================================"

# Check build exists
if [ ! -f "$DIST_DIR/bmf-backend" ]; then
    echo " ERROR: dist/bmf-backend not found. Run ./1_build.sh first."
    exit 1
fi

# ── Create remote directories ────────────────────────────────
echo ""
echo "[1/5] Creating directories on server..."
ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" \
    "mkdir -p $REMOTE_APP $REMOTE_HOME/logs $REMOTE_WEB"

# ── Upload backend binary ────────────────────────────────────
echo "[2/5] Uploading backend binary..."
scp -P "$SERVER_PORT" \
    "$DIST_DIR/bmf-backend" \
    "$SERVER_USER@$SERVER_HOST:$REMOTE_APP/bmf-backend"

# ── Upload server management scripts ────────────────────────
echo "[3/5] Uploading server scripts..."
scp -P "$SERVER_PORT" \
    "$DEPLOY_DIR/3_server_setup.sh" \
    "$DEPLOY_DIR/start.sh" \
    "$DEPLOY_DIR/stop.sh" \
    "$DEPLOY_DIR/restart.sh" \
    "$SERVER_USER@$SERVER_HOST:$REMOTE_APP/"

# ── Upload database schema ───────────────────────────────────
echo "[4/5] Uploading database schema..."
scp -P "$SERVER_PORT" \
    "$DEPLOY_DIR/schema.sql" \
    "$SERVER_USER@$SERVER_HOST:$REMOTE_HOME/schema.sql"

# ── Upload frontend + .htaccess ──────────────────────────────
echo "[5/5] Uploading frontend to public_html/$SUBFOLDER/ ..."
scp -P "$SERVER_PORT" -r \
    "$DIST_DIR/public_html/." \
    "$SERVER_USER@$SERVER_HOST:$REMOTE_WEB/"

scp -P "$SERVER_PORT" \
    "$DEPLOY_DIR/public_html/.htaccess" \
    "$SERVER_USER@$SERVER_HOST:$REMOTE_WEB/.htaccess"

echo ""
echo "============================================"
echo " UPLOAD COMPLETE"
echo "============================================"
echo ""
echo " Next — SSH into server and run:"
echo ""
echo "   ssh -p $SERVER_PORT $SERVER_USER@shohozit.com"
echo ""
echo "   # Create .env with your DB credentials:"
echo "   nano ~/app/.env"
echo ""
echo "   # Run setup (imports schema + starts backend):"
echo "   bash ~/app/3_server_setup.sh"
echo ""
echo " Your site will be at:"
echo "   https://shohozit.com/barakah_foundation/"
echo "============================================"
