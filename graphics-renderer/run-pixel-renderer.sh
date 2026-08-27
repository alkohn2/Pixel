#!/usr/bin/env bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUILD_DIR="${SCRIPT_DIR}/build"
PID_FILE="${SCRIPT_DIR}/.renderer.pid"
LOG_FILE="${SCRIPT_DIR}/renderer.log"

echo "=========================================="
echo " Starting PIXEL Native Graphics Renderer"
echo "=========================================="

cd "${SCRIPT_DIR}" || exit 1

# 1. Singleton Check: Prevent multiple renderer instances
if [ -f "${PID_FILE}" ]; then
  OLD_PID=$(cat "${PID_FILE}" 2>/dev/null)
  if [ -n "${OLD_PID}" ] && kill -0 "${OLD_PID}" 2>/dev/null; then
    echo "PIXEL Graphics Renderer is already running (PID: ${OLD_PID})."
    exit 0
  fi
  rm -f "${PID_FILE}"
fi

EXISTING_PID=$(pgrep -f "pixel-graphics-renderer" | grep -v "$$" | head -n 1 2>/dev/null)
if [ -n "${EXISTING_PID}" ] && kill -0 "${EXISTING_PID}" 2>/dev/null; then
  echo "PIXEL Graphics Renderer is already running (PID: ${EXISTING_PID})."
  echo "${EXISTING_PID}" > "${PID_FILE}"
  exit 0
fi

# 2. Ensure executable exists and is up to date
if [ ! -f "${BUILD_DIR}/pixel-graphics-renderer" ] || [ "${SCRIPT_DIR}/src/main.m" -nt "${BUILD_DIR}/pixel-graphics-renderer" ] || [ "${SCRIPT_DIR}/src/Processing.NDI.Lib.h" -nt "${BUILD_DIR}/pixel-graphics-renderer" ]; then
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
> "${LOG_FILE}"
nohup "${BUILD_DIR}/pixel-graphics-renderer" >> "${LOG_FILE}" 2>&1 &
RENDERER_PID=$!

echo "${RENDERER_PID}" > "${PID_FILE}"

# 3. Robust Startup Health Verification
STARTED=0
for i in {1..50}; do
  if ! kill -0 "${RENDERER_PID}" 2>/dev/null; then
    echo "Error: Renderer process exited prematurely."
    break
  fi
  if grep -q "NDI Sender created successfully" "${LOG_FILE}" 2>/dev/null; then
    STARTED=1
    break
  fi
  sleep 0.1
done

if [ "${STARTED}" -eq 1 ]; then
  echo "PIXEL Graphics Renderer started successfully (PID: ${RENDERER_PID})."
  echo "Log: ${LOG_FILE}"
  exit 0
else
  echo "Error: Renderer failed to start. Check ${LOG_FILE}"
  exit 1
fi
