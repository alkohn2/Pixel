#!/usr/bin/env bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="${SCRIPT_DIR}/.renderer.pid"

echo "=========================================="
echo " Stopping PIXEL Native Graphics Renderer"
echo "=========================================="

STOPPED=0

# 1. Stop PID from file
if [ -f "${PID_FILE}" ]; then
  RENDERER_PID=$(cat "${PID_FILE}" 2>/dev/null)
  if [ -n "${RENDERER_PID}" ] && kill -0 "${RENDERER_PID}" 2>/dev/null; then
    echo "Stopping PIXEL Graphics Renderer (PID: ${RENDERER_PID})..."
    kill -15 "${RENDERER_PID}" 2>/dev/null
    for i in {1..20}; do
      if ! kill -0 "${RENDERER_PID}" 2>/dev/null; then
        break
      fi
      sleep 0.1
    done
    if kill -0 "${RENDERER_PID}" 2>/dev/null; then
      kill -9 "${RENDERER_PID}" 2>/dev/null
    fi
    STOPPED=1
  fi
  rm -f "${PID_FILE}"
fi

# 2. Sweep any lingering pixel-graphics-renderer processes
LINGERING_PIDS=$(pgrep -f "pixel-graphics-renderer" | grep -v "$$" 2>/dev/null)
if [ -n "${LINGERING_PIDS}" ]; then
  echo "Terminating lingering renderer processes: ${LINGERING_PIDS}..."
  kill -15 ${LINGERING_PIDS} 2>/dev/null
  sleep 0.5
  for PID in ${LINGERING_PIDS}; do
    if kill -0 "${PID}" 2>/dev/null; then
      kill -9 "${PID}" 2>/dev/null
    fi
  done
  STOPPED=1
fi

rm -f "${PID_FILE}"

# 3. Verify zero renderer processes remain
REMAINING=$(pgrep -f "pixel-graphics-renderer" | grep -v "$$" 2>/dev/null)
if [ -z "${REMAINING}" ]; then
  echo "✅ Zero renderer processes remaining."
  if [ "${STOPPED}" -eq 1 ]; then
    echo "PIXEL Graphics Renderer stopped cleanly."
  else
    echo "PIXEL Graphics Renderer was not running."
  fi
  exit 0
else
  echo "❌ Warning: Could not terminate renderer PID(s): ${REMAINING}"
  exit 1
fi
