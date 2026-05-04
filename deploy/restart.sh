#!/bin/bash
# Restart the Barakah Foundation backend
APP_DIR="$HOME/app"
echo "Restarting backend..."
bash "$APP_DIR/stop.sh"
sleep 1
bash "$APP_DIR/start.sh"
