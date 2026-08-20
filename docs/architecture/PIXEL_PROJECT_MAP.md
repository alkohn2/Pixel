# PIXEL Production System — Architectural Project Map

**Canonical Root Path**: `/Volumes/VGC-01/OBS Sports/PIXEL`

---

## 1. Directory Tree Structure

```
/Volumes/VGC-01/OBS Sports/PIXEL/
├── frontend/                     # Canonical React 19 / TypeScript / Vite "vento" Application UI
│   ├── src/                      # Components, Stores, Types, Services
│   │   ├── components/           # MultiviewGrid, ProgramPreviewMonitors, SourceMappingTable, etc.
│   │   ├── services/             # bridgeClient, obsClient, resolumeClient, volleyballControl
│   │   └── store/                # useSwitcherStore (Unified Zustand/React store)
│   ├── dist/                     # Compiled production build served on port 8081
│   │   └── diagnostics.html      # Emergency Diagnostic UI fallback
│   ├── public/                   # Static assets & icons
│   ├── package.json
│   └── vite.config.ts
├── production-bridge/            # Canonical Telemetry & Monitoring Backend (Node.js)
│   ├── monitor.js                # Multi-subsystem read-only telemetry engine
│   ├── decklink-monitor          # Native Blackmagic DeckLink SDK 16.0 passive status binary
│   ├── setup.json                # Physical signal routing & DeckLink channel mappings
│   └── package.json
├── diagnostics/                  # Fallback & Diagnostic Tools
│   └── pixel.html                # Standalone lightweight emergency diagnostic dashboard
├── configs/                      # Canonical Production Profiles & Routing Maps
│   ├── setup.json
│   └── pixel_profiles_all_20260812.json
├── docs/                         # Technical Documentation
│   ├── architecture/
│   │   └── PIXEL_PROJECT_MAP.md  # This document
│   ├── decklink/                 # SDK investigation scripts & specifications
│   └── walkthroughs/
├── assets/                       # Shared branding & media assets
├── backups/                      # Timestamped safety backups
│   └── backup_20260820_unification/
├── start-pixel.command           # One-click system startup script
└── stop-pixel.command            # Safe system shutdown script (LISTEN-only process targeting)
```

---

## 2. Port Allocation Plan

| Port | Service | Description | Access URL |
| :--- | :--- | :--- | :--- |
| **3000** | Production Bridge API | Telemetry & status backend | `http://127.0.0.1:3000/status` |
| **8081** | React PIXEL UI | Main canonical production interface | `http://127.0.0.1:8081/` |
| **8081** | Diagnostic UI | Standalone emergency fallback UI | `http://127.0.0.1:8081/diagnostics.html` |
| **4455** | OBS WebSocket | OBS Studio read-only telemetry | `ws://127.0.0.1:4455` |
| **8080** | Resolume REST API | Resolume Arena read-only telemetry | `http://127.0.0.1:8080/api/v1` |
| **1935** | Hudl Production Truck | Internal RTMP stream relay | `rtmp://127.0.0.1:1935` |

---

## 3. Subsystem Integration & Read-Only Safety Rules

1. **ATEM Television Studio Pro HD** (`192.168.0.78`):
   - **STRICTLY READ-ONLY**. No CUT, AUTO, Program/Preview change, or Macro commands sent.
2. **OBS Studio** (`127.0.0.1:4455`):
   - **STRICTLY READ-ONLY**. Monitors Program/Preview scenes, Studio mode, recording, and streaming states.
3. **Resolume Arena** (`127.0.0.1:8080`):
   - **STRICTLY READ-ONLY**. Polled via REST API for composition name, BPM, active column, and active clips.
4. **DeckLink Quad 2** (`SDK 16.0`):
   - **STRICTLY READ-ONLY**. Native helper binary queries `IDeckLinkStatus` passively without stream capture activation.
5. **Hudl Production Truck** (`v4.15.0`):
   - **STRICTLY READ-ONLY**. Process monitoring (`pgrep`) and real-time read-only log tailing with explicit `DIRECT`, `INFERRED`, and `UNKNOWN` confidence ratings.

---

## 4. Startup & Shutdown Operations

* **Start System**: Double-click [`start-pixel.command`](file:///Volumes/VGC-01/OBS%20Sports/PIXEL/start-pixel.command) or run:
  ```bash
  "/Volumes/VGC-01/OBS Sports/PIXEL/start-pixel.command"
  ```
* **Stop System**: Double-click [`stop-pixel.command`](file:///Volumes/VGC-01/OBS%20Sports/PIXEL/stop-pixel.command) or run:
  ```bash
  "/Volumes/VGC-01/OBS Sports/PIXEL/stop-pixel.command"
  ```

---

## 5. Backup & Legacy Fallback Paths

- **Original Production Bridge Backup**: `/Users/akohn/production-bridge` (100% preserved untouched).
- **Original Vento Repository Backup**: `/Volumes/VGC-01/vento` (100% preserved untouched).
- **Project Unification Backup**: `/Volumes/VGC-01/OBS Sports/PIXEL/backups/backup_20260820_unification`
