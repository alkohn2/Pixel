const fs = require('fs');
const path = require('path');
const http = require('http');

// Replay Directory Resolution (Environment Variable -> Project Relative -> Legacy Fallback)
function resolveReplaysDir() {
  if (process.env.PIXEL_REPLAYS_DIR) {
    return path.resolve(process.env.PIXEL_REPLAYS_DIR);
  }
  // If explicitly operating from the legacy VGC-01 volume and path exists, preserve it
  const isLegacyLocation = __dirname.startsWith('/Volumes/VGC-01');
  const legacyPath = '/Volumes/VGC-01/OBS Sports/Replays';
  if (isLegacyLocation && fs.existsSync(legacyPath)) {
    return legacyPath;
  }
  // Otherwise, derive local Replays directory relative to project root
  return path.resolve(__dirname, '../Replays');
}

const WATCH_DIR = resolveReplaysDir();
try {
  if (!fs.existsSync(WATCH_DIR)) {
    fs.mkdirSync(WATCH_DIR, { recursive: true });
    console.log(`Created replay directory: ${WATCH_DIR}`);
  }
} catch (err) {
  console.warn(`Warning: Could not create replay directory ${WATCH_DIR}:`, err.message);
}
const RESOLUME_HOST = '127.0.0.1';
const RESOLUME_PORT = 8080;
const RESOLUME_TARGET_LAYER = 'REPLAYS';
const STABILITY_POLL_INTERVAL_MS = 500;
const REQUIRED_STABLE_CHECKS = 3; // 3 consecutive checks (1.5s total stability window)

// State Tracking
const startTime = Date.now();
const seenFiles = new Set();
const pendingStability = new Map(); // filePath -> { lastSize, lastMtime, stableChecks, firstSeenAt }
const importedFiles = new Set();

console.log('====================================================');
console.log(' PIXEL Replay Watchfolder Service (Truck → Resolume)');
console.log('====================================================');
console.log(`Watching directory: ${WATCH_DIR}`);
console.log(`Target Resolume: http://${RESOLUME_HOST}:${RESOLUME_PORT}/api/v1/`);
console.log(`Target Layer: ${RESOLUME_TARGET_LAYER}`);
console.log(`Stability window: ${REQUIRED_STABLE_CHECKS} consecutive checks @ ${STABILITY_POLL_INTERVAL_MS}ms`);
console.log(`Ignoring all files created before: ${new Date(startTime).toLocaleTimeString()}`);
console.log('----------------------------------------------------');

// Mark existing files as already seen so we only process new files created during the test
try {
  if (fs.existsSync(WATCH_DIR)) {
    const existing = fs.readdirSync(WATCH_DIR);
    for (const f of existing) {
      seenFiles.add(path.join(WATCH_DIR, f));
    }
    console.log(`Initial scan: ${seenFiles.size} existing items marked as ignored.`);
  } else {
    console.log('Replay watch directory initialized (empty).');
  }
} catch (err) {
  console.error(`Error reading initial directory ${WATCH_DIR}:`, err.message);
}

// Helpers for Resolume REST API
function resolumeRequest(method, endpoint, body = null, contentType = 'application/json') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: RESOLUME_HOST,
      port: RESOLUME_PORT,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': contentType
      }
    };

    if (body && contentType === 'text/plain') {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function findReplaysLayer() {
  const compRes = await resolumeRequest('GET', '/api/v1/composition');
  if (compRes.statusCode !== 200) {
    throw new Error(`Failed to query Resolume composition: HTTP ${compRes.statusCode}`);
  }

  const composition = JSON.parse(compRes.data);
  const layers = composition.layers || [];

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const layerName = layer.name?.value || layer.name;
    if (layerName && layerName.toUpperCase() === RESOLUME_TARGET_LAYER.toUpperCase()) {
      return {
        layerIndex: i + 1, // Resolume uses 1-based indexing for layers
        layerId: layer.id,
        layerName: layerName,
        clips: layer.clips || []
      };
    }
  }

  return null;
}

async function findNextEmptySlot(layerIndex) {
  const layerRes = await resolumeRequest('GET', `/api/v1/composition/layers/${layerIndex}`);
  if (layerRes.statusCode !== 200) {
    throw new Error(`Failed to query layer ${layerIndex}: HTTP ${layerRes.statusCode}`);
  }

  const layerData = JSON.parse(layerRes.data);
  const clips = layerData.clips || [];

  for (let c = 0; c < clips.length; c++) {
    const clip = clips[c];
    const clipName = clip.name?.value ?? clip.name ?? '';
    const hasVideo = clip.video && clip.video.fileinfo;
    if (clipName === '' && !hasVideo) {
      return {
        slotIndex: c + 1, // 1-based clip index
        clipId: clip.id
      };
    }
  }

  throw new Error(`No empty clip slots found in layer ${RESOLUME_TARGET_LAYER} (total slots: ${clips.length})`);
}

async function importClipToResolume(filePath) {
  const filename = path.basename(filePath);
  console.log(`\n[IMPORT] Preparing import for stable file: ${filename}`);

  // 1. Find REPLAYS layer
  const layerInfo = await findReplaysLayer();
  if (!layerInfo) {
    throw new Error(`Layer "${RESOLUME_TARGET_LAYER}" not found in current Resolume composition!`);
  }

  // 2. Find next empty slot
  const slotInfo = await findNextEmptySlot(layerInfo.layerIndex);

  // 3. Format file URI with percent-encoding
  // Format: file:///Volumes/VGC-01/OBS%20Sports/Replays/Camera%202%20C6156890.mov
  const uriPath = filePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const fileUri = `file://${uriPath}`;

  console.log(`[IMPORT] Assigning to Layer ${layerInfo.layerIndex} (${layerInfo.layerName}) Slot ${slotInfo.slotIndex}...`);
  console.log(`[IMPORT] File URI: ${fileUri}`);

  // 4. Send open command (POST /api/v1/composition/layers/{layer}/clips/{clip}/open with text/plain)
  const openEndpoint = `/api/v1/composition/layers/${layerInfo.layerIndex}/clips/${slotInfo.slotIndex}/open`;
  const openRes = await resolumeRequest('POST', openEndpoint, fileUri, 'text/plain');

  if (openRes.statusCode === 204 || openRes.statusCode === 200) {
    const importEvent = {
      event: 'REPLAY_IMPORTED_TO_RESOLUME',
      timestamp: new Date().toISOString(),
      filename: filename,
      filePath: filePath,
      targetLayer: layerInfo.layerName,
      layerIndex: layerInfo.layerIndex,
      slotIndex: slotInfo.slotIndex,
      importResult: 'SUCCESS',
      fileUri: fileUri
    };
    console.log(`[EVENT] REPLAY_IMPORTED_TO_RESOLUME ✅`);
    console.log(JSON.stringify(importEvent, null, 2));
    importedFiles.add(filePath);
    return importEvent;
  } else {
    const failEvent = {
      event: 'REPLAY_IMPORT_FAILED',
      timestamp: new Date().toISOString(),
      filename: filename,
      filePath: filePath,
      targetLayer: layerInfo.layerName,
      layerIndex: layerInfo.layerIndex,
      slotIndex: slotInfo.slotIndex,
      httpStatus: openRes.statusCode,
      response: openRes.data
    };
    console.error(`[EVENT] REPLAY_IMPORT_FAILED ❌`);
    console.error(JSON.stringify(failEvent, null, 2));
    throw new Error(`Resolume API returned HTTP ${openRes.statusCode}: ${openRes.data}`);
  }
}

// Watch & Stability Loop
function pollReplayDirectory() {
  try {
    if (!fs.existsSync(WATCH_DIR)) return;

    const files = fs.readdirSync(WATCH_DIR);

    for (const file of files) {
      // Filter out invalid items
      if (file.startsWith('._') || file === 'old' || !file.toLowerCase().endsWith('.mov')) {
        continue;
      }

      const fullPath = path.join(WATCH_DIR, file);

      // Check if file was already imported or seen before start
      if (importedFiles.has(fullPath) || seenFiles.has(fullPath)) {
        continue;
      }

      // Check file stats
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue; // File might be temporarily locked by Truck
      }

      // If not yet in pending map, register detection
      if (!pendingStability.has(fullPath)) {
        // Double check creation/birth time vs startup time
        const fileTime = Math.max(stat.mtimeMs, stat.birthtimeMs);
        if (fileTime < startTime - 2000) {
          seenFiles.add(fullPath);
          continue;
        }

        const detectEvent = {
          event: 'REPLAY_FILE_DETECTED',
          timestamp: new Date().toISOString(),
          filename: file,
          path: fullPath,
          sizeBytes: stat.size,
          mtime: stat.mtime.toISOString()
        };
        console.log(`\n[EVENT] REPLAY_FILE_DETECTED 🎬: ${file} (${stat.size} bytes)`);
        console.log(JSON.stringify(detectEvent, null, 2));

        pendingStability.set(fullPath, {
          lastSize: stat.size,
          lastMtime: stat.mtimeMs,
          stableChecks: 0,
          firstSeenAt: Date.now()
        });
        continue;
      }

      // If in pending map, check stability
      const entry = pendingStability.get(fullPath);
      if (stat.size > 0 && stat.size === entry.lastSize && stat.mtimeMs === entry.lastMtime) {
        entry.stableChecks++;
        // console.log(`[STABILITY] ${file}: check ${entry.stableChecks}/${REQUIRED_STABLE_CHECKS}`);

        if (entry.stableChecks >= REQUIRED_STABLE_CHECKS) {
          const stableDurationMs = Date.now() - entry.firstSeenAt;
          const stableEvent = {
            event: 'REPLAY_FILE_STABLE',
            timestamp: new Date().toISOString(),
            filename: file,
            path: fullPath,
            sizeBytes: stat.size,
            stableDurationMs: stableDurationMs,
            checksCompleted: entry.stableChecks
          };
          console.log(`\n[EVENT] REPLAY_FILE_STABLE 🔒: ${file} (${stat.size} bytes, stable after ${stableDurationMs}ms)`);
          console.log(JSON.stringify(stableEvent, null, 2));

          pendingStability.delete(fullPath);

          // Trigger import
          importClipToResolume(fullPath).catch(err => {
            console.error(`[ERROR] Import failed for ${file}:`, err.message);
          });
        }
      } else {
        // File size or mtime changed (Truck is still actively writing!)
        entry.lastSize = stat.size;
        entry.lastMtime = stat.mtimeMs;
        entry.stableChecks = 0;
      }
    }
  } catch (err) {
    console.error('Error in pollReplayDirectory:', err.message);
  }
}

// Start polling loop
console.log(`Watcher active. Waiting for new .mov replays from Truck in ${WATCH_DIR}...`);
const watcherInterval = setInterval(pollReplayDirectory, STABILITY_POLL_INTERVAL_MS);

// Process signals
process.on('SIGINT', () => {
  clearInterval(watcherInterval);
  console.log('\nWatcher stopped.');
  process.exit(0);
});
process.on('SIGTERM', () => {
  clearInterval(watcherInterval);
  console.log('\nWatcher stopped.');
  process.exit(0);
});
