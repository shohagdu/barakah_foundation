#!/bin/bash
# Start the Barakah Foundation backend
APP_DIR="$HOME/app"
LOG_DIR="$HOME/logs"
PID_FILE="$APP_DIR/bmf.pid"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Backend already running (PID: $(cat "$PID_FILE"))"
    exit 0
fi

mkdir -p "$LOG_DIR"
cd "$APP_DIR"

nohup ./bmf-backend >> "$LOG_DIR/bmf.log" 2>&1 &
echo $! > "$PID_FILE"
echo "Backend started (PID: $!)"
echo "Logs: tail -f $LOG_DIR/bmf.log"
