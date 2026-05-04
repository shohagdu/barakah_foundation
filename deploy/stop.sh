#!/bin/bash
# Stop the Barakah Foundation backend
APP_DIR="$HOME/app"
PID_FILE="$APP_DIR/bmf.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        rm -f "$PID_FILE"
        echo "Backend stopped (PID: $PID)"
    else
        echo "Process not running, cleaning up PID file"
        rm -f "$PID_FILE"
    fi
else
    # Fallback: kill by name
    pkill -f bmf-backend && echo "Backend stopped" || echo "Backend was not running"
fi
