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
3. **Blackmagic Desktop Video Driver**: *(Optional)* Required only if physical DeckLink SDI hardware cards are attached to that machine.

---

## 2. Bundled with PIXEL (Zero Machine Path Assumptions)

All the following components reside entirely inside the `PIXEL` directory and have **zero hardcoded external drive dependencies (`/Volumes/VGC-01/`)**:

- **PIXEL Native Syphon Graphics Renderer** (`graphics-renderer/`):
  - Binary: `graphics-renderer/build/pixel-graphics-renderer` (`Mach-O Universal 2 fat binary: arm64 + x86_64`).
  - Source: `graphics-renderer/src/main.m` (Native Cocoa `NSWindow` + `WKWebView` with hardware-accelerated `drawsBackground = false` alpha compositing).
  - Framework: Vendored `graphics-renderer/Frameworks/Syphon.framework` (BSD 3-Clause License, Universal 2: `arm64` + `x86_64`).
  - Dynamic Linkage: `@rpath/Syphon.framework` with relative runtime path `@executable_path/../Frameworks`.
  - Runtime Config: `graphics-renderer/config.json`.
- **Production Bridge** (`production-bridge/`): ATEM OSC / Macro and hardware bridge API (Port 3000).
- **Frontend & Overlays** (`frontend/dist/`): Complete React management UI, Master Overlay Canvas, Graphics Controller, Roster Editor, and Game Package Manager (Port 8081).
- **Offline Motion Engine**: Anime.js v4.5.0 and Tabler Icons offline bundles.
- **Branding & Assets**: Vector SVG logos and athlete portraits (`frontend/graphics/assets/`).

---

## 3. Clean Machine Quickstart Sequence

When copying the `PIXEL` directory to a new laptop:

```bash
# 1. Navigate to frontend and build production distribution
cd PIXEL/frontend
npm ci
npm run build

# 2. Start PIXEL Production System
cd ..
./start-pixel.command

# 3. Start Native Syphon Graphics Renderer
./graphics-renderer/run-pixel-renderer.sh

# 4. Open Resolume Arena
# The "pixel-graphics-renderer - PIXEL Graphics" source will appear under Sources -> Syphon.
# Bind to Layer 5 ("Overlays") Slot 5.
```

---

## 4. Lifecycle & Process Management

| Action | Command | Mechanism |
| :--- | :--- | :--- |
| **Start Renderer** | `./graphics-renderer/run-pixel-renderer.sh` | Launches background daemon, writes PID to `.renderer.pid` |
| **Stop Renderer** | `./graphics-renderer/stop-pixel-renderer.sh` | Sends `kill` specifically to recorded PID; zero collateral impact |
| **Recompile Binary** | `clang -O3 -fobjc-arc -arch arm64 -arch x86_64 -DGL_SILENCE_DEPRECATION -F Frameworks -framework Syphon -framework WebKit -framework Cocoa -framework OpenGL -Wl,-rpath,@executable_path/../Frameworks src/main.m -o build/pixel-graphics-renderer` | Compiles native Universal 2 (arm64 + x86_64) executable |

---

## 5. Failure Recovery & Reconnect Matrix

| Failure Event | System Behavior | Recovery Action |
| :--- | :--- | :--- |
| **Renderer starts before Resolume** | Syphon server registers immediately in VRAM | Resolume auto-binds upon launch |
| **Resolume starts before Renderer** | Layer 5 displays transparent/empty | Resolume locks to stream when renderer starts |
| **Renderer process crash** | Layer 5 holds transparent frame | `./graphics-renderer/run-pixel-renderer.sh` re-spawns cleanly |
| **UI Server restart** | Renderer retains last DOM frame | Auto-reconnects DOM and state channels |
