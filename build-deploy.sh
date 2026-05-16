#!/bin/bash
# ============================================================
# Build deploy.zip for cPanel upload
# Run: bash build-deploy.sh
# ============================================================
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
PACKAGE="$ROOT/deploy/package"
SUBFOLDER="barakah_foundation"

echo "============================================"
echo " Barakah Foundation — Build deploy.zip"
echo "============================================"

# ── 1. Build Rust backend (static musl binary) ───────────────
echo ""
echo "[1/4] Building Rust backend..."
if ! rustup target list --installed | grep -q "x86_64-unknown-linux-musl"; then
    echo "      Installing musl target..."
    rustup target add x86_64-unknown-linux-musl
fi
cd "$BACKEND"
cargo build --release --target x86_64-unknown-linux-musl
echo "      OK: binary ready"

# ── 2. Build React frontend ──────────────────────────────────
echo ""
echo "[2/4] Building React frontend..."
cd "$FRONTEND"

# Ensure .env.production has correct API base
echo "VITE_API_BASE=/$SUBFOLDER/api" > .env.production

npx vite build --base=/$SUBFOLDER/
echo "      OK: frontend ready"

# Verify no hardcoded /api URLs in build
HARDCODED=$(grep -oE '"/api[^"]*"' dist/assets/index-*.js 2>/dev/null | sort -u)
if [ -n "$HARDCODED" ]; then
    echo ""
    echo "      WARNING: Hardcoded /api URLs found in build:"
    echo "$HARDCODED"
    echo "      Fix in source code: use \${API_BASE} not hardcoded \"/api\""
    echo ""
fi

# ── 3. Copy artifacts into deploy/package/ ───────────────────
echo ""
echo "[3/4] Updating deploy package..."

# Backend binary
cp "$BACKEND/target/x86_64-unknown-linux-musl/release/bmf-backend" \
   "$PACKAGE/barakah_foundation_api/bmf-backend"
chmod +x "$PACKAGE/barakah_foundation_api/bmf-backend"

# Frontend (replace assets + index.html)
rm -rf "$PACKAGE/public_html/$SUBFOLDER/assets"
rm -f  "$PACKAGE/public_html/$SUBFOLDER/index.html"
cp -r "$FRONTEND/dist/assets" "$PACKAGE/public_html/$SUBFOLDER/assets"
cp     "$FRONTEND/dist/index.html" "$PACKAGE/public_html/$SUBFOLDER/index.html"

# Latest schema (if migrations folder updated)
LATEST_SCHEMA=$(ls -t "$ROOT/migrations"/barakah_foundation*.sql 2>/dev/null | head -1)
if [ -n "$LATEST_SCHEMA" ]; then
    cp "$LATEST_SCHEMA" "$PACKAGE/schema.sql"
    echo "      Schema: $(basename "$LATEST_SCHEMA")"
fi

echo "      OK: package updated"

# ── 4. Create deploy.zip ─────────────────────────────────────
echo ""
echo "[4/4] Creating deploy.zip..."
rm -f "$ROOT/deploy.zip"
cd "$PACKAGE"
zip -r "$ROOT/deploy.zip" . > /dev/null
SIZE=$(du -sh "$ROOT/deploy.zip" | cut -f1)

echo ""
echo "============================================"
echo " DONE"
echo "============================================"
echo " File: $ROOT/deploy.zip"
echo " Size: $SIZE"
echo ""
echo " Next steps:"
echo "   1. Upload deploy.zip to cPanel (~/)"
echo "   2. SSH: cd ~ && unzip -o deploy.zip"
echo "   3. SSH: bash ~/barakah_foundation_api/restart.sh"
echo "   4. Browser: Ctrl+Shift+R (hard refresh)"
echo "============================================"
