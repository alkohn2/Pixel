#!/usr/bin/env bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUILD_DIR="${SCRIPT_DIR}/build"
PID_FILE="${SCRIPT_DIR}/.renderer.pid"
LOG_FILE="${SCRIPT_DIR}/renderer.log"

echo "=========================================="
echo " Starting PIXEL Native Graphics Renderer"
echo "=========================================="

cd "${SCRIPT_DIR}" || exit 1

# Check if already running
if [ -f "${PID_FILE}" ]; then
  OLD_PID=$(cat "${PID_FILE}" 2>/dev/null)
  if [ -n "${OLD_PID}" ] && ps -p "${OLD_PID}" > /dev/null 2>&1; then
    echo "PIXEL Graphics Renderer is already running (PID: ${OLD_PID})."
    exit 0
  fi
fi

# Ensure executable exists
if [ ! -f "${BUILD_DIR}/pixel-graphics-renderer" ] || [ "${SCRIPT_DIR}/src/main.m" -nt "${BUILD_DIR}/pixel-graphics-renderer" ]; then
  echo "Compiling PIXEL Graphics Renderer..."
  mkdir -p "${BUILD_DIR}"
  clang -O3 -fobjc-arc -Wno-deprecated-declarations \
    -F"${SCRIPT_DIR}/Frameworks" \
    -I"${SCRIPT_DIR}/src" \
    -framework Cocoa -framework WebKit -framework OpenGL -framework Syphon \
    -L"${SCRIPT_DIR}/Frameworks" -lndi \
    -rpath @executable_path/../Frameworks \
    "${SCRIPT_DIR}/src/main.m" \
    -o "${BUILD_DIR}/pixel-graphics-renderer"
  if [ $? -ne 0 ]; then
    echo "Error: Compilation failed"
    exit 1
  fi
fi

chmod +x "${BUILD_DIR}/pixel-graphics-renderer"

echo "Launching renderer in background..."
nohup "${BUILD_DIR}/pixel-graphics-renderer" > "${LOG_FILE}" 2>&1 &
RENDERER_PID=$!

echo "${RENDERER_PID}" > "${PID_FILE}"
sleep 1

if ps -p "${RENDERER_PID}" > /dev/null 2>&1; then
  echo "PIXEL Graphics Renderer started successfully (PID: ${RENDERER_PID})."
  echo "Log: ${LOG_FILE}"
else
  echo "Error: Renderer failed to start. Check ${LOG_FILE}"
  exit 1
fi
