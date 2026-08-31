#!/usr/bin/env bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BRIDGE_DIR="${SCRIPT_DIR}/production-bridge"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"
RENDERER_DIR="${SCRIPT_DIR}/graphics-renderer"

echo "=========================================="
echo " Stopping PIXEL Production System"
echo " Phase R3: Clean Coordinated Teardown"
echo "=========================================="

# 1. Stop Graphics Renderer
if [ -f "${RENDERER_DIR}/stop-pixel-renderer.sh" ]; then
  "${RENDERER_DIR}/stop-pixel-renderer.sh"
fi

# 2. Stop listening services on ports 3000 and 8081
echo "Stopping listening services on ports 3000 and 8081..."
LISTEN_PIDS=$(lsof -tiTCP:3000,8081 -sTCP:LISTEN 2>/dev/null)
if [ -n "$LISTEN_PIDS" ]; then
  kill $LISTEN_PIDS 2>/dev/null
  sleep 1
  lsof -tiTCP:3000,8081 -sTCP:LISTEN | xargs kill -9 2>/dev/null
  echo "Stopped listening server PIDs: $LISTEN_PIDS"
else
  echo "No active server listeners found on ports 3000 or 8081."
fi

# 3. Stop Replay Watcher process
if [ -f "${BRIDGE_DIR}/.watcher.pid" ]; then
  WATCHER_PID=$(cat "${BRIDGE_DIR}/.watcher.pid" 2>/dev/null)
  if [ -n "$WATCHER_PID" ]; then
    kill $WATCHER_PID 2>/dev/null
    echo "Stopped Replay Watcher PID: $WATCHER_PID"
  fi
fi
pgrep -f "node replay-watcher.js" | xargs kill 2>/dev/null

# 4. Sweep PID files
rm -f "${BRIDGE_DIR}/.bridge.pid" "${BRIDGE_DIR}/.watcher.pid" "${FRONTEND_DIR}/.ui.pid" "${RENDERER_DIR}/.renderer.pid" 2>/dev/null

# 5. Verify zero renderer processes remain
REMAINING_RENDERERS=$(pgrep -f "pixel-graphics-renderer" | grep -v "$$" 2>/dev/null)
if [ -n "${REMAINING_RENDERERS}" ]; then
  echo "⚠️ Forcing termination of lingering renderer PIDs: ${REMAINING_RENDERERS}"
  kill -9 ${REMAINING_RENDERERS} 2>/dev/null
fi

echo "✅ PIXEL Production System and Graphics Renderer stopped cleanly."
