#!/usr/bin/env bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="${SCRIPT_DIR}/.renderer.pid"

echo "=========================================="
echo " Stopping PIXEL Native Graphics Renderer"
echo "=========================================="

if [ -f "${PID_FILE}" ]; then
  RENDERER_PID=$(cat "${PID_FILE}" 2>/dev/null)
  if [ -n "${RENDERER_PID}" ] && ps -p "${RENDERER_PID}" > /dev/null 2>&1; then
    echo "Stopping PIXEL Graphics Renderer (PID: ${RENDERER_PID})..."
    kill "${RENDERER_PID}" 2>/dev/null
    sleep 1
    if ps -p "${RENDERER_PID}" > /dev/null 2>&1; then
      kill -9 "${RENDERER_PID}" 2>/dev/null
    fi
    echo "PIXEL Graphics Renderer stopped."
  else
    echo "PIXEL Graphics Renderer was not running."
  fi
  rm -f "${PID_FILE}"
else
  echo "No PID file found. Checking for lingering processes..."
  pgrep -f "pixel-graphics-renderer" | xargs kill 2>/dev/null || true
fi
