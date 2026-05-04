#!/bin/bash
# ============================================================
# STEP 1 — LOCAL BUILD SCRIPT
# Run this on your LOCAL development machine
# Deploy path: public_html/barakah_foundation/
# ============================================================
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
DEPLOY_DIR="$PROJECT_ROOT/deploy"
SUBFOLDER="barakah_foundation"

echo "============================================"
echo " Barakah Foundation — Build for cPanel"
echo " Deploy path: public_html/$SUBFOLDER/"
echo "============================================"

# ── 1. Build Rust Backend (static musl binary) ───────────────
echo ""
echo "[1/2] Building Rust backend..."
echo "      Target: x86_64-unknown-linux-musl (static binary)"

if ! rustup target list --installed | grep -q "x86_64-unknown-linux-musl"; then
    echo "      Installing musl target..."
    rustup target add x86_64-unknown-linux-musl
fi

# On Ubuntu/Debian: sudo apt install musl-tools
cd "$BACKEND_DIR"
cargo build --release --target x86_64-unknown-linux-musl

echo "      ✓ Binary ready"

# ── 2. Build React Frontend with subfolder base path ─────────
echo ""
echo "[2/2] Building React frontend (base=/$SUBFOLDER/)..."

cd "$FRONTEND_DIR"
npm install

# Build with subfolder base so assets load from /barakah_foundation/
npx vite build --base=/$SUBFOLDER/

echo "      ✓ Frontend ready: frontend/dist/"

# ── 3. Copy into deploy/dist/ ────────────────────────────────
echo ""
echo "Copying build artifacts to deploy/dist/ ..."

rm -rf "$DEPLOY_DIR/dist"
mkdir -p "$DEPLOY_DIR/dist/public_html"

# Binary
cp "$BACKEND_DIR/target/x86_64-unknown-linux-musl/release/bmf-backend" \
   "$DEPLOY_DIR/dist/bmf-backend"
chmod +x "$DEPLOY_DIR/dist/bmf-backend"

# Frontend → goes into barakah_foundation subfolder
cp -r "$FRONTEND_DIR/dist/." "$DEPLOY_DIR/dist/public_html/"

echo ""
echo "============================================"
echo " BUILD COMPLETE"
echo "============================================"
echo " Binary  : deploy/dist/bmf-backend"
echo " Frontend: deploy/dist/public_html/"
echo ""
echo " Next: edit 2_upload.sh with your server info"
echo "       then run: ./2_upload.sh"
echo "============================================"
