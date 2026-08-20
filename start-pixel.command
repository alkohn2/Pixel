#!/usr/bin/env bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BRIDGE_DIR="${SCRIPT_DIR}/production-bridge"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"

echo "=========================================="
echo " Starting PIXEL Production System"
echo "=========================================="

cd "${BRIDGE_DIR}" || { echo "Error: Bridge directory not found!"; exit 1; }

# Safely terminate ONLY server processes listening on PIXEL ports (never client browsers)
LISTEN_PIDS=$(lsof -tiTCP:3000,8081 -sTCP:LISTEN 2>/dev/null)
if [ -n "$LISTEN_PIDS" ]; then
  echo "Stopping existing listening server processes ($LISTEN_PIDS)..."
  kill $LISTEN_PIDS 2>/dev/null
  sleep 1
  lsof -tiTCP:3000,8081 -sTCP:LISTEN | xargs kill -9 2>/dev/null
fi

echo "Starting Production Bridge API (Port 3000)..."
nohup node monitor.js > "${BRIDGE_DIR}/bridge.log" 2>&1 &
BRIDGE_PID=$!
echo ${BRIDGE_PID} > "${BRIDGE_DIR}/.bridge.pid"

echo "Starting Canonical PIXEL React UI (Port 8081)..."
cd "${FRONTEND_DIR}/dist" || { echo "Error: Frontend dist directory not found!"; exit 1; }
nohup python3 -m http.server 8081 > "${FRONTEND_DIR}/ui.log" 2>&1 &
UI_PID=$!
echo ${UI_PID} > "${FRONTEND_DIR}/.ui.pid"

sleep 2

echo "------------------------------------------"
echo " PIXEL API:        http://127.0.0.1:3000/status"
echo " PIXEL React UI:   http://127.0.0.1:8081/"
echo " Diagnostic UI:    http://127.0.0.1:8081/diagnostics.html"
echo "------------------------------------------"

open "http://127.0.0.1:8081/" 2>/dev/null || true

echo "PIXEL Production System started successfully!"
