# PIXEL Operations Guide

This guide provides operational procedures for directors, operators, and engineers using the PIXEL Production System.

---

## 1. Daily Startup Procedure

1. **Hardware Preparation**:
   - Ensure Blackmagic ATEM Television Studio Pro HD is powered and connected to IP `192.168.0.78`.
   - Ensure DeckLink Quad 2 SDI cables are seated securely in BNC connectors.
   - Verify OBS Studio and Resolume Arena applications are open (if used for graphics/stream).

2. **Launch PIXEL**:
   - Open Terminal and execute:
     ```bash
     /Volumes/VGC-01/OBS Sports/PIXEL/start-pixel.command
     ```
   - Confirm output displays:
     ```text
     PIXEL API:        http://127.0.0.1:3000/status
     PIXEL React UI:   http://127.0.0.1:8081/
     ```

3. **Verify Bridge Status**:
   - Open web browser to `http://127.0.0.1:8081/`.
   - Confirm top-right badge displays `BRIDGE: LAB_CURRENT (READ-ONLY)`.

4. **Execute Preflight Check**:
   - Click **Preflight** on the Right Operations Rail.
   - Confirm status pill displays `🟢 READY TO BROADCAST`.

---

## 2. Pre-Show Production Checklist

| Subsystem | Requirement | Verification Step |
| :--- | :--- | :--- |
| **ATEM** | IP Connected & Operational | Verify Program/Preview source labels match ATEM LCD. |
| **DeckLink** | SDK Active & Signal Locked | Verify SDI input format badges (`1080p59.94`) on source tiles. |
| **OBS Studio** | WebSocket Connected (:4455) | Confirm OBS status badge displays `PASS`. |
| **Resolume** | REST API Connected (:8080) | Confirm composition name `Sports` and active layers appear. |
| **Hudl Truck** | Process & Output Active | Confirm Truck card displays `running: true` and `outputPresent: INFERRED`. |
| **Volleyball** | Scoreboard Synchronized | Confirm Volleyball panel displays live score and active server. |

---

## 3. Shutdown Procedure

To cleanly terminate PIXEL without affecting browser client windows or running broadcast apps:

```bash
/Volumes/VGC-01/OBS Sports/PIXEL/stop-pixel.command
```

This script targets ONLY listening sockets on ports `3000` and `8081` (`lsof -tiTCP:3000,8081 -sTCP:LISTEN`).

---

## 4. Emergency Recovery Procedure

If PIXEL UI stops updating or Bridge shows `STALE`/`OFFLINE`:

1. **Verify Backend Process**:
   - Run `curl -s http://127.0.0.1:3000/health` in Terminal.
   - If response returns `{"bridge":"ONLINE",...}`, refresh browser tab (`Cmd + R`).

2. **Restart PIXEL System**:
   - Execute `/Volumes/VGC-01/OBS Sports/PIXEL/start-pixel.command`.
   - The script will automatically kill any frozen listening sockets and restart both API and UI servers in < 5 seconds.

3. **Fallback Diagnostic Interface**:
   - Open `http://127.0.0.1:8081/diagnostics.html` to view raw JSON telemetry directly from Production Bridge.
