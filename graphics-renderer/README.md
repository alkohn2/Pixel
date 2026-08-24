# PIXEL Native Graphics Renderer

Self-contained macOS WebKit & GPU graphics renderer for the PIXEL Sports Graphics System.

## Architecture

```
[PIXEL Frontend Server :8081]
          ↓ (HTTP/DOM)
[PIXEL Native Graphics Renderer (WKWebView)]
          ↓ (32-bit RGBA Transparent GPU Surface)
[Syphon Server: "PIXEL Graphics"]
          ↓ (Zero-Copy VRAM Texture)
[Resolume Arena 7 Layer 5: Overlays]
```

## Features

- **Zero OBS Involvement**: Pure standalone native renderer decoupled from Replay.
- **Hardware Acceleration**: 1920x1080 @ 59.94 / 60.00 fps rendering.
- **100% Alpha Transparency**: Native straight alpha with transparent viewport background (`drawsBackground = false`).
- **Zero Configuration Hardcoding**: Configured via `config.json`.

## Configuration (`config.json`)

```json
{
  "sourceName": "PIXEL Graphics",
  "host": "127.0.0.1",
  "port": 8081,
  "overlayPath": "/graphics/volleyball/volleyball-master-overlay.html",
  "width": 1920,
  "height": 1080,
  "fps": 59.94,
  "alpha": true
}
```

## Usage

### Start Renderer:
```bash
./run-pixel-renderer.sh
```

### Stop Renderer:
```bash
./stop-pixel-renderer.sh
```

### Recompile (if modifying `src/main.swift`):
```bash
swiftc -O src/main.swift -o build/pixel-graphics-renderer
```
