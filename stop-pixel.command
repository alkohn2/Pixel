#!/usr/bin/env bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BRIDGE_DIR="${SCRIPT_DIR}/production-bridge"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"

echo "=========================================="
echo " Stopping PIXEL Production System"
echo "=========================================="

echo "Stopping listening services on ports 3000 and 8081..."

# Target ONLY server processes listening on ports 3000/8081 (never ESTABLISHED client browser connections)
LISTEN_PIDS=$(lsof -tiTCP:3000,8081 -sTCP:LISTEN 2>/dev/null)

if [ -n "$LISTEN_PIDS" ]; then
  kill $LISTEN_PIDS 2>/dev/null
  sleep 1
  lsof -tiTCP:3000,8081 -sTCP:LISTEN | xargs kill -9 2>/dev/null
  echo "Stopped listening server PIDs: $LISTEN_PIDS"
else
  echo "No active PIXEL server listeners found on ports 3000 or 8081."
fi

# Stop Replay Watcher process
if [ -f "${BRIDGE_DIR}/.watcher.pid" ]; then
  WATCHER_PID=$(cat "${BRIDGE_DIR}/.watcher.pid" 2>/dev/null)
  if [ -n "$WATCHER_PID" ]; then
    kill $WATCHER_PID 2>/dev/null
    echo "Stopped Replay Watcher PID: $WATCHER_PID"
  fi
fi
pgrep -f "node replay-watcher.js" | xargs kill 2>/dev/null

rm -f "${BRIDGE_DIR}/.bridge.pid" "${BRIDGE_DIR}/.watcher.pid" "${FRONTEND_DIR}/.ui.pid" 2>/dev/null

echo "PIXEL System stopped cleanly."
