#!/bin/bash
APP_DIR="$HOME/barakah_foundation_api"
bash "$APP_DIR/stop.sh"
sleep 1
bash "$APP_DIR/start.sh"
