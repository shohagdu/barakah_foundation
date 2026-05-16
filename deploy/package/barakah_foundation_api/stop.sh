#!/bin/bash
APP_DIR="$HOME/barakah_foundation_api"
PID_FILE="$APP_DIR/bmf.pid"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    kill "$(cat "$PID_FILE")"
    rm -f "$PID_FILE"
    echo "Stopped"
else
    pkill -f bmf-backend 2>/dev/null && echo "Stopped (force)" || echo "Not running"
    rm -f "$PID_FILE"
fi
