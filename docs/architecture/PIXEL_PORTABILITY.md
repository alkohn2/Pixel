# PIXEL System Portability & Deployment Architecture

This document specifies the software requirements, deployment instructions, and runtime architecture for deploying the PIXEL Production & Sports Graphics System onto any secondary macOS laptop.

---

## 1. System Requirements & Architecture

### Hardware & Operating System:
- **Architecture**: **Universal 2** (Native Apple Silicon `arm64` + Intel `x86_64`).
- **Operating System**: macOS 14.0 (Sonoma) or macOS 15.0+ (Sequoia).

### System Software (Host Mac Requirements):
1. **Node.js**: Version 20.x or 24.x LTS (with `npm`).
2. **Resolume Arena 7**: Version 7.20.1+ with production composition (`Sports.avc` or standard broadcast template).
3. **NDI Runtime**: Standard NDI 5.x runtime (e.g. NDI Tools / `libndi.dylib`).
4. **Blackmagic Desktop Video Driver**: *(Optional)* Required only if physical DeckLink SDI hardware cards are attached to that machine.

---

## 2. Bundled with PIXEL (Zero Machine Path Assumptions)

All the following components reside entirely inside the `PIXEL` directory and have **zero hardcoded external drive dependencies (`/Volumes/VGC-01/`)**:

- **PIXEL Graphics Renderer** (`graphics-renderer/`):
  - Binary: `graphics-renderer/build/pixel-graphics-renderer` (`Mach-O Universal 2 fat binary: arm64 + x86_64`).
  - Source: `graphics-renderer/src/main.m` (Native Cocoa `NSWindow` + `WKWebView` with hardware-accelerated `drawsBackground = false` alpha compositing).
  - Frameworks: Vendored `libndi.dylib` (NDI 5.5.3, Universal 2) and `Syphon.framework` (BSD 3-Clause, Universal 2).
  - Transports: **NDI** (Official Production Default) with **Syphon** (Local GPU Fallback).
  - Dynamic Linkage: `@rpath/libndi.dylib` and `@rpath/Syphon.framework` with relative runtime path `@executable_path/../Frameworks`.
  - Runtime Config: `graphics-renderer/config.json`.
- **Production Bridge** (`production-bridge/`): Cross-Process Graphics State API, SSE event stream, ATEM OSC / Macro, and hardware bridge API (Port 3000).
- **Frontend & Overlays** (`frontend/dist/`): Complete React management UI, Master Overlay Canvas, Graphics Controller, Roster Editor, and Game Package Manager (Port 8081).
- **Offline Motion Engine**: Anime.js v4.5.0 and Tabler Icons offline bundles.
- **Branding & Assets**: Vector SVG logos and athlete portraits (`frontend/graphics/assets/`).

---

## 3. Cross-Process State Architecture

```
[Volleyball Control :8081]        [Graphics Control :8081]
          ↓ (Scoring State)                 ↓ (Presentation Actions)
    POST /graphics/state              POST /graphics/state
          └────────────────┬────────────────┘
                           ↓
             [Production Bridge :3000]
                           ↓ SSE Stream: GET /graphics/events
           [PIXEL Master Overlay :8081]
                           ↓ (1920x1080 32-bit RGBA)
             [PIXEL Graphics Renderer]
                           ↓ NDI 5.5.3: "PIXEL Graphics"
             [Resolume Arena 7 Layer 5]
                           ↓ DeckLink SDI 1
             [ATEM Input 6: RESOLUME]
```

---

## 4. Clean Machine Quickstart Sequence

When copying the `PIXEL` directory to a new laptop:

```bash
# 1. Navigate to frontend and build production distribution
cd PIXEL/frontend
npm ci
npm run build

# 2. Start PIXEL Production System
cd ..
./start-pixel.command

# 3. Start Native NDI Graphics Renderer
./graphics-renderer/run-pixel-renderer.sh

# 4. Open Resolume Arena
# The "PIXEL Graphics" source will appear under Sources -> NDI.
# Bind to Layer 5 ("Overlays") Slot 5.
```

---

## 5. Lifecycle & Process Management

| Action | Command | Mechanism |
| :--- | :--- | :--- |
| **Start Renderer** | `./graphics-renderer/run-pixel-renderer.sh` | Launches background daemon, writes PID to `.renderer.pid` |
| **Stop Renderer** | `./graphics-renderer/stop-pixel-renderer.sh` | Sends `kill` specifically to recorded PID; zero collateral impact |
| **Recompile Binary** | Run clang compiler script linking vendored frameworks in `Frameworks/` | Compiles native Universal 2 (arm64 + x86_64) executable |

---

## 6. Failure Recovery & Reconnect Matrix

| Failure Event | System Behavior | Recovery Action |
| :--- | :--- | :--- |
| **Renderer starts before Resolume** | NDI mDNS advertisement active | Resolume auto-binds upon launch |
| **Resolume starts before Renderer** | Layer 5 displays transparent/empty | Resolume locks to NDI stream when renderer starts |
| **Renderer process crash** | Layer 5 holds transparent frame | `./graphics-renderer/run-pixel-renderer.sh` re-spawns cleanly |
| **UI Server restart** | Renderer retains last DOM frame | Auto-reconnects DOM and state channels |
| **Production Bridge restart** | Overlay SSE stream reconnects automatically | Syncs latest match & presentation state |
