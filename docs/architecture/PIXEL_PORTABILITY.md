# PIXEL System Portability & Deployment Architecture

This document specifies the software requirements, deployment instructions, and runtime architecture for deploying the PIXEL Production & Sports Graphics System onto any secondary macOS laptop.

---

## 1. System Requirements

### System Software (To be installed on Host Mac):
1. **Operating System**: macOS 14.0 (Sonoma) or macOS 15.0+ (Sequoia) on Apple Silicon (M1/M2/M3/M4) or Intel.
2. **Node.js**: Version 20.x or 24.x LTS (with `npm`).
3. **Resolume Arena 7**: Version 7.20.1+ with production composition (`Sports.avc` or standard broadcast template).
4. **Blackmagic Desktop Video Driver**: *(Optional)* Required only if physical DeckLink SDI hardware cards are attached to that machine.

---

## 2. Bundled with PIXEL (Zero Extra Installs)

All the following components reside entirely inside the `PIXEL` directory and have **zero external drive path dependencies**:

- **PIXEL Graphics Renderer** (`graphics-renderer/`): Standalone native macOS WebKit graphics runner.
- **Production Bridge** (`production-bridge/`): ATEM OSC / Macro and hardware bridge API.
- **Frontend & Overlays** (`frontend/dist/`): Complete React management UI, Master Overlay Canvas, Graphics Controller, Roster Editor, and Game Package Manager.
- **Offline Motion Engine**: Anime.js v4.5.0 and Tabler Icons offline bundles.
- **Branding & Assets**: Vector SVG logos and athlete portraits (`frontend/graphics/assets/`).

---

## 3. Clean Machine Quickstart Sequence

When copying the `PIXEL` folder to a new laptop:

```bash
# 1. Navigate to frontend and build production distribution
cd PIXEL/frontend
npm ci
npm run build

# 2. Start PIXEL Production System
cd ..
./start-pixel.command

# 3. Start Graphics Renderer
./graphics-renderer/run-pixel-renderer.sh

# 4. Open Resolume Arena
# The "PIXEL Graphics" source will appear under Sources -> Syphon.
# Drag to Layer 5 ("Overlays") Slot 5.
```

---

## 4. Failure Recovery & Reconnect Matrix

| Failure Event | System Behavior | Recovery Action |
| :--- | :--- | :--- |
| **Renderer starts before Resolume** | GPU texture advertises immediately | Resolume binds automatically upon launch |
| **Resolume starts before Renderer** | Layer 5 displays transparent/empty | Resolume locks to stream when renderer starts |
| **Renderer process crash** | Layer 5 holds transparent frame | `./graphics-renderer/run-pixel-renderer.sh` re-spawns cleanly |
| **UI Server restart** | Renderer retains last DOM frame | Auto-reconnects DOM and state channels |
