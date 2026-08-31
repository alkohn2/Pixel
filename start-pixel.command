#!/usr/bin/env bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export PIXEL_ROOT="${SCRIPT_DIR}"
BRIDGE_DIR="${SCRIPT_DIR}/production-bridge"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"
RENDERER_DIR="${SCRIPT_DIR}/graphics-renderer"

echo "=========================================="
echo " Starting PIXEL Production System"
echo " Phase R3: Sequenced Health-Gated Startup"
echo "=========================================="

# 1. Clean previous listening servers if any
LISTEN_PIDS=$(lsof -tiTCP:3000,8081 -sTCP:LISTEN 2>/dev/null)
if [ -n "$LISTEN_PIDS" ]; then
  echo "Stopping existing listening server processes ($LISTEN_PIDS)..."
  kill $LISTEN_PIDS 2>/dev/null
  sleep 1
  lsof -tiTCP:3000,8081 -sTCP:LISTEN | xargs kill -9 2>/dev/null
fi

# Clean previous replay-watcher
if [ -f "${BRIDGE_DIR}/.watcher.pid" ]; then
  OLD_WATCHER_PID=$(cat "${BRIDGE_DIR}/.watcher.pid" 2>/dev/null)
  if [ -n "$OLD_WATCHER_PID" ]; then
    kill $OLD_WATCHER_PID 2>/dev/null
  fi
fi
pgrep -f "node replay-watcher.js" | xargs kill 2>/dev/null

# ==============================================================================
# STEP 1: Start Production Bridge API
# ==============================================================================
echo ""
echo "[STEP 1/4] Starting Production Bridge API (Port 3000)..."
cd "${BRIDGE_DIR}" || { echo "❌ Error: Bridge directory not found!"; exit 1; }
nohup node monitor.js > "${BRIDGE_DIR}/bridge.log" 2>&1 &
BRIDGE_PID=$!
echo ${BRIDGE_PID} > "${BRIDGE_DIR}/.bridge.pid"

# Readiness Gate: Wait for Bridge Health Endpoint
BRIDGE_READY=0
for i in {1..30}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 1 "http://127.0.0.1:3000/health" 2>/dev/null)
  if [ "${HTTP_CODE}" == "200" ]; then
    BRIDGE_READY=1
    break
  fi
  sleep 0.2
done

if [ "${BRIDGE_READY}" -eq 1 ]; then
  echo "✅ Production Bridge is ONLINE (PID: ${BRIDGE_PID})"
else
  echo "⚠️ Warning: Production Bridge did not report ready within 6s (check ${BRIDGE_DIR}/bridge.log)"
fi

# Start Replay Watcher
echo "Starting Replay Watcher (Truck → Resolume)..."
nohup node replay-watcher.js > "${BRIDGE_DIR}/replay-watcher.log" 2>&1 &
WATCHER_PID=$!
echo ${WATCHER_PID} > "${BRIDGE_DIR}/.watcher.pid"

# ==============================================================================
# STEP 2: Start Frontend / Static Overlay Server
# ==============================================================================
echo ""
echo "[STEP 2/4] Starting Frontend & Overlay Server (Port 8081)..."
cd "${FRONTEND_DIR}/dist" || { echo "❌ Error: Frontend dist directory not found!"; exit 1; }
nohup python3 -m http.server 8081 > "${FRONTEND_DIR}/ui.log" 2>&1 &
UI_PID=$!
echo ${UI_PID} > "${FRONTEND_DIR}/.ui.pid"

# Readiness Gate: Wait for Overlay URL and Root UI
OVERLAY_READY=0
for i in {1..30}; do
  ROOT_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 1 "http://127.0.0.1:8081/" 2>/dev/null)
  OVERLAY_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 1 "http://127.0.0.1:8081/graphics/volleyball/volleyball-master-overlay.html" 2>/dev/null)
  if [ "${ROOT_CODE}" == "200" ] && [ "${OVERLAY_CODE}" == "200" ]; then
    OVERLAY_READY=1
    break
  fi
  sleep 0.2
done

if [ "${OVERLAY_READY}" -eq 1 ]; then
  echo "✅ Frontend & Master Overlay Server ONLINE (PID: ${UI_PID})"
else
  echo "❌ Error: Overlay server failed to serve master overlay (HTTP ${OVERLAY_CODE})"
fi

# ==============================================================================
# STEP 3: Start Native Graphics Renderer (NDI: 'PIXEL Graphics')
# ==============================================================================
echo ""
echo "[STEP 3/4] Starting Native Graphics Renderer..."
cd "${RENDERER_DIR}" || { echo "❌ Error: Renderer directory not found!"; exit 1; }
"${RENDERER_DIR}/run-pixel-renderer.sh"
RENDERER_STATUS=$?

# ==============================================================================
# STEP 4: Validate Discovery & Launch UI
# ==============================================================================
echo ""
echo "[STEP 4/4] Validating Graphics Pipeline..."
sleep 0.5
PIPELINE_JSON=$(curl -s --max-time 2 "http://127.0.0.1:3000/graphics/pipeline" 2>/dev/null)
OVERALL_STATUS=$(echo "${PIPELINE_JSON}" | grep -o '"overall": "[^"]*' | cut -d'"' -f4)
if [ -z "${OVERALL_STATUS}" ]; then
  OVERALL_STATUS="INITIALIZING"
fi

echo "=========================================="
echo " PIXEL API:        http://127.0.0.1:3000/status"
echo " PIXEL React UI:   http://127.0.0.1:8081/"
echo " Master Overlay:   http://127.0.0.1:8081/graphics/volleyball/volleyball-master-overlay.html"
echo " GRAPHICS STATUS:  ${OVERALL_STATUS}"
echo "=========================================="

open "http://127.0.0.1:8081/" 2>/dev/null || true

if [ "${OVERALL_STATUS}" == "ONLINE" ]; then
  echo "🎉 PIXEL Production System started successfully — ALL SYSTEMS ONLINE!"
else
  echo "⚠️ PIXEL started with warnings (Status: ${OVERALL_STATUS})."
  echo "   Use the 'REPAIR GRAPHICS PIPELINE' button in the Output Monitor UI if needed."
fi
