#!/usr/bin/env bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUILD_DIR="${SCRIPT_DIR}/build"
PID_FILE="${SCRIPT_DIR}/.renderer.pid"
LOG_FILE="${SCRIPT_DIR}/renderer.log"
NDI_DISCOVER="${BUILD_DIR}/ndi-discover-source"
RENDERER_BIN="${BUILD_DIR}/pixel-graphics-renderer"

echo "=========================================="
echo " Starting PIXEL Native Graphics Renderer"
echo "=========================================="

cd "${SCRIPT_DIR}" || exit 1

# Optional flag: --force-restart
FORCE_RESTART=0
SKIP_PREREQ=0
for arg in "$@"; do
  if [ "$arg" == "--force-restart" ]; then FORCE_RESTART=1; fi
  if [ "$arg" == "--skip-prereqs" ]; then SKIP_PREREQ=1; fi
done

# 1. Prerequisite Readiness Gate (Overlay & Bridge Server)
if [ "${SKIP_PREREQ}" -eq 0 ]; then
  OVERLAY_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://127.0.0.1:8081/graphics/volleyball/volleyball-master-overlay.html" 2>/dev/null)
  if [ "${OVERLAY_HTTP_CODE}" != "200" ]; then
    echo "❌ Error: Overlay server is not reachable (http://127.0.0.1:8081/graphics/volleyball/volleyball-master-overlay.html returned '${OVERLAY_HTTP_CODE}')."
    echo "   Ensure Frontend static server is started on port 8081 before starting the renderer."
    exit 2
  fi
fi

# 2. Singleton Check: Prevent duplicate or stale instances
if [ "${FORCE_RESTART}" -eq 1 ]; then
  echo "Force restart requested. Stopping any existing renderer..."
  "${SCRIPT_DIR}/stop-pixel-renderer.sh" >/dev/null 2>&1
else
  if [ -f "${PID_FILE}" ]; then
    OLD_PID=$(cat "${PID_FILE}" 2>/dev/null)
    if [ -n "${OLD_PID}" ] && kill -0 "${OLD_PID}" 2>/dev/null; then
      # Check if NDI source is discoverable
      if [ -x "${NDI_DISCOVER}" ] && "${NDI_DISCOVER}" "PIXEL Graphics" >/dev/null 2>&1; then
        echo "✅ PIXEL Graphics Renderer is already running and healthy (PID: ${OLD_PID})."
        exit 0
      else
        echo "⚠️ Existing renderer PID ${OLD_PID} is alive but NDI discovery failed. Restarting..."
        kill -15 "${OLD_PID}" 2>/dev/null
        sleep 1
        kill -9 "${OLD_PID}" 2>/dev/null
        rm -f "${PID_FILE}"
      fi
    else
      rm -f "${PID_FILE}"
    fi
  fi

  EXISTING_PID=$(pgrep -f "pixel-graphics-renderer" | grep -v "$$" | head -n 1 2>/dev/null)
  if [ -n "${EXISTING_PID}" ] && kill -0 "${EXISTING_PID}" 2>/dev/null; then
    if [ -x "${NDI_DISCOVER}" ] && "${NDI_DISCOVER}" "PIXEL Graphics" >/dev/null 2>&1; then
      echo "✅ PIXEL Graphics Renderer is already running and healthy (PID: ${EXISTING_PID})."
      echo "${EXISTING_PID}" > "${PID_FILE}"
      exit 0
    else
      echo "⚠️ Existing renderer process ${EXISTING_PID} is unhealthy. Terminating..."
      kill -15 "${EXISTING_PID}" 2>/dev/null
      sleep 1
      kill -9 "${EXISTING_PID}" 2>/dev/null
      rm -f "${PID_FILE}"
    fi
  fi
fi

# 3. Ensure binaries exist and are compiled
if [ ! -f "${RENDERER_BIN}" ] || [ "${SCRIPT_DIR}/src/main.m" -nt "${RENDERER_BIN}" ]; then
  echo "Compiling PIXEL Graphics Renderer..."
  mkdir -p "${BUILD_DIR}"
  clang -O3 -fobjc-arc -Wno-deprecated-declarations \
    -F"${SCRIPT_DIR}/Frameworks" \
    -I"${SCRIPT_DIR}/src" \
    -framework Cocoa -framework WebKit -framework OpenGL -framework Syphon \
    -L"${SCRIPT_DIR}/Frameworks" -lndi \
    -rpath @executable_path/../Frameworks \
    "${SCRIPT_DIR}/src/main.m" \
    -o "${RENDERER_BIN}"
  if [ $? -ne 0 ]; then
    echo "❌ Error: Renderer compilation failed"
    exit 1
  fi
fi

if [ ! -f "${NDI_DISCOVER}" ] || [ "${SCRIPT_DIR}/src/ndi_find.c" -nt "${NDI_DISCOVER}" ]; then
  echo "Compiling NDI Discovery Utility..."
  clang -O3 -L"${SCRIPT_DIR}/Frameworks" -lndi -Wl,-rpath,"${SCRIPT_DIR}/Frameworks" \
    "${SCRIPT_DIR}/src/ndi_find.c" -o "${NDI_DISCOVER}"
fi

chmod +x "${RENDERER_BIN}" "${NDI_DISCOVER}" 2>/dev/null

# 4. Launch Renderer in background
echo "Launching renderer process..."
> "${LOG_FILE}"
nohup "${RENDERER_BIN}" >> "${LOG_FILE}" 2>&1 &
RENDERER_PID=$!
echo "${RENDERER_PID}" > "${PID_FILE}"

# 5. Health Gate Verification
NDI_CREATED=0
FRAME_SENT=0
OVERLAY_LOADED=0
DISCOVERABLE=0

for i in {1..40}; do
  if ! kill -0 "${RENDERER_PID}" 2>/dev/null; then
    echo "❌ Error: Renderer process exited prematurely."
    exit 1
  fi

  if [ "${NDI_CREATED}" -eq 0 ] && grep -q "NDI Sender created successfully" "${LOG_FILE}" 2>/dev/null; then
    NDI_CREATED=1
  fi

  if [ "${FRAME_SENT}" -eq 0 ] && grep -q "First NDI video frame transmitted" "${LOG_FILE}" 2>/dev/null; then
    FRAME_SENT=1
  fi

  if [ "${OVERLAY_LOADED}" -eq 0 ] && grep -q "Web overlay loaded and running" "${LOG_FILE}" 2>/dev/null; then
    OVERLAY_LOADED=1
  fi

  if [ "${NDI_CREATED}" -eq 1 ] && [ "${FRAME_SENT}" -eq 1 ]; then
    break
  fi
  sleep 0.1
done

# Check NDI Discovery
if [ -x "${NDI_DISCOVER}" ]; then
  if "${NDI_DISCOVER}" "PIXEL Graphics" >/dev/null 2>&1; then
    DISCOVERABLE=1
  fi
fi

echo "------------------------------------------"
echo " Process PID:      ${RENDERER_PID}"
echo " NDI Sender:       $([ "${NDI_CREATED}" -eq 1 ] && echo 'READY ✅' || echo 'FAIL ❌')"
echo " Video Frames:     $([ "${FRAME_SENT}" -eq 1 ] && echo 'TRANSMITTING ✅' || echo 'FAIL ❌')"
echo " Overlay WebKit:   $([ "${OVERLAY_LOADED}" -eq 1 ] && echo 'LOADED ✅' || echo 'WAITING ⏳')"
echo " NDI Discovery:    $([ "${DISCOVERABLE}" -eq 1 ] && echo 'DISCOVERABLE ✅' || echo 'FAIL ❌')"
echo "------------------------------------------"

if [ "${NDI_CREATED}" -eq 1 ] && [ "${FRAME_SENT}" -eq 1 ]; then
  echo "✅ PIXEL Graphics Renderer started successfully (PID: ${RENDERER_PID})."
  exit 0
else
  echo "❌ Error: Renderer failed health gates. Check ${LOG_FILE}"
  exit 1
fi
