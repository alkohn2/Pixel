const { Atem } = require('atem-connection')
const { OBSWebSocket } = require('obs-websocket-js')
const { execFile, exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')
const http = require('http')

const atem = new Atem()
const obs = new OBSWebSocket()

const ATEM_IP = '192.168.0.78'
const OBS_WS_URL = 'ws://127.0.0.1:4455'
const RESOLUME_URL = 'http://127.0.0.1:8080/api/v1'
const DECKLINK_MONITOR_BIN = path.join(__dirname, 'decklink-monitor')
const PORT = 3000

const setupPath = path.join(__dirname, 'setup.json')
const setup = JSON.parse(fs.readFileSync(setupPath, 'utf8'))
const SOURCES = setup.sources || {}
const DECKLINK_MAPPING = setup.decklinkMapping || {}

function sourceName(input) {
  return SOURCES[String(input)] || `UNASSIGNED_${input}`
}

const bridgeState = {
  bridge: 'ONLINE',
  atemConnected: false,
  obsConnected: false,
  resolumeConnected: false,
  decklinkConnected: false,
  truckConnected: false,
  profile: setup.profile,
  program: null,
  preview: null,
  obs: {
    connected: false,
    programScene: null,
    previewScene: null,
    studioMode: false,
    recording: false,
    streaming: false
  },
  resolume: {
    connected: false,
    version: null,
    compositionName: null,
    bpm: null,
    activeColumn: null,
    layers: []
  },
  decklink: {
    connected: false,
    cardModel: 'DeckLink Quad 2',
    mapping: DECKLINK_MAPPING,
    channels: {}
  },
  truck: {
    connected: false,
    running: false,
    version: '4.15.0',
    integrationMethod: 'Log Tail & Process Monitor',
    outputPresent: { value: false, confidence: 'UNKNOWN' },
    replayReady: { value: null, confidence: 'UNKNOWN' },
    replaySource: { value: null, confidence: 'UNKNOWN' },
    lastActivityAt: null,
    confidence: 'INFERRED'
  },
  manualControl: {
    enabled: Boolean(setup.manualControl?.enabled),
    mode: 'MANUAL_CONTROL',
    obsTransitionMacroIndex: setup.manualControl?.obsTransitionMacroIndex ?? 0,
    transitionLocked: false,
    lastTriggeredAt: null,
    lastResult: null
  },
  updatedAt: null,
  events: []
}

function addEvent(type, message, details = {}) {
  const event = {
    time: new Date().toISOString(),
    type,
    message,
    ...details
  }

  bridgeState.events.unshift(event)

  // Mantener solo los últimos 50 eventos
  if (bridgeState.events.length > 50) {
    bridgeState.events = bridgeState.events.slice(0, 50)
  }

  console.log(`EVENT: ${message}`)
}

// ============================================================================
// ATEM READ-ONLY MODULE
// ============================================================================
function updateAtemState(state) {
  const me = state?.video?.mixEffects?.[0]
  if (!me) return

  const newProgram = {
    input: me.programInput,
    name: sourceName(me.programInput)
  }

  const newPreview = {
    input: me.previewInput,
    name: sourceName(me.previewInput)
  }

  if (
    bridgeState.program &&
    bridgeState.program.input !== newProgram.input
  ) {
    addEvent(
      'PROGRAM_CHANGED',
      `PROGRAM changed: ${bridgeState.program.name} → ${newProgram.name}`,
      {
        from: bridgeState.program,
        to: newProgram
      }
    )
  }

  if (
    bridgeState.preview &&
    bridgeState.preview.input !== newPreview.input
  ) {
    addEvent(
      'PREVIEW_CHANGED',
      `PREVIEW changed: ${bridgeState.preview.name} → ${newPreview.name}`,
      {
        from: bridgeState.preview,
        to: newPreview
      }
    )
  }

  bridgeState.program = newProgram
  bridgeState.preview = newPreview
  bridgeState.updatedAt = new Date().toISOString()

  console.log(
    `ATEM PROGRAM: ${bridgeState.program.name} | PREVIEW: ${bridgeState.preview.name}`
  )
}

// ============================================================================
// OBS READ-ONLY MODULE & AUTO-RECONNECT
// ============================================================================
let obsConnecting = false

async function initOBSState() {
  try {
    const pScene = await obs.call('GetCurrentProgramScene')
    bridgeState.obs.programScene = pScene.currentProgramSceneName || pScene.sceneName || null

    try {
      const modeRes = await obs.call('GetStudioModeEnabled')
      bridgeState.obs.studioMode = !!modeRes.studioModeEnabled
    } catch {
      bridgeState.obs.studioMode = false
    }

    if (bridgeState.obs.studioMode) {
      try {
        const prevRes = await obs.call('GetCurrentPreviewScene')
        bridgeState.obs.previewScene = prevRes.currentPreviewSceneName || prevRes.sceneName || null
      } catch {
        bridgeState.obs.previewScene = null
      }
    } else {
      bridgeState.obs.previewScene = null
    }

    try {
      const recRes = await obs.call('GetRecordStatus')
      bridgeState.obs.recording = !!recRes.outputActive
    } catch {
      bridgeState.obs.recording = false
    }

    try {
      const strmRes = await obs.call('GetStreamStatus')
      bridgeState.obs.streaming = !!strmRes.outputActive
    } catch {
      bridgeState.obs.streaming = false
    }

    bridgeState.updatedAt = new Date().toISOString()
  } catch (err) {
    console.error('Error fetching OBS initial state:', err.message)
  }
}

async function connectOBS() {
  if (bridgeState.obsConnected || obsConnecting) return
  obsConnecting = true

  try {
    await obs.connect(OBS_WS_URL)
    obsConnecting = false
    bridgeState.obsConnected = true
    bridgeState.obs.connected = true
    addEvent('OBS_CONNECTED', 'OBS WebSocket connected')
    console.log('OBS CONNECTED ✅')
    await initOBSState()
  } catch (err) {
    obsConnecting = false
    bridgeState.obsConnected = false
    bridgeState.obs.connected = false
  }
}

obs.on('Identified', async () => {
  obsConnecting = false
  bridgeState.obsConnected = true
  bridgeState.obs.connected = true
  await initOBSState()
})

obs.on('ConnectionClosed', () => {
  obsConnecting = false
  if (bridgeState.obsConnected) {
    bridgeState.obsConnected = false
    bridgeState.obs.connected = false
    bridgeState.obs.programScene = null
    bridgeState.obs.previewScene = null
    bridgeState.obs.studioMode = false
    bridgeState.obs.recording = false
    bridgeState.obs.streaming = false
    addEvent('OBS_DISCONNECTED', 'OBS WebSocket disconnected')
    console.log('OBS DISCONNECTED ❌')
  }
})

obs.on('ConnectionError', (err) => {
  obsConnecting = false
  console.error('OBS WebSocket Error:', err?.message || err)
})

obs.on('CurrentProgramSceneChanged', (data) => {
  const newScene = data.sceneName || data.currentProgramSceneName
  if (newScene && bridgeState.obs.programScene !== newScene) {
    const oldScene = bridgeState.obs.programScene || 'NONE'
    bridgeState.obs.programScene = newScene
    bridgeState.updatedAt = new Date().toISOString()
    addEvent('OBS_PROGRAM_CHANGED', `OBS PROGRAM changed: ${oldScene} → ${newScene}`, {
      from: oldScene,
      to: newScene
    })
  }
})

obs.on('CurrentPreviewSceneChanged', (data) => {
  const newScene = data.sceneName || data.currentPreviewSceneName
  if (newScene && bridgeState.obs.previewScene !== newScene) {
    const oldScene = bridgeState.obs.previewScene || 'NONE'
    bridgeState.obs.previewScene = newScene
    bridgeState.updatedAt = new Date().toISOString()
    addEvent('OBS_PREVIEW_CHANGED', `OBS PREVIEW changed: ${oldScene} → ${newScene}`, {
      from: oldScene,
      to: newScene
    })
  }
})

obs.on('StudioModeStateChanged', async (data) => {
  const enabled = !!data.studioModeEnabled
  bridgeState.obs.studioMode = enabled
  if (enabled) {
    try {
      const prevRes = await obs.call('GetCurrentPreviewScene')
      bridgeState.obs.previewScene = prevRes.currentPreviewSceneName || prevRes.sceneName || null
    } catch {
      bridgeState.obs.previewScene = null
    }
  } else {
    bridgeState.obs.previewScene = null
  }
  bridgeState.updatedAt = new Date().toISOString()
  addEvent('OBS_STUDIO_MODE_CHANGED', `OBS Studio Mode: ${enabled ? 'ENABLED' : 'DISABLED'}`)
})

obs.on('RecordStateChanged', (data) => {
  const isRecording = data.outputActive
  if (bridgeState.obs.recording !== isRecording) {
    bridgeState.obs.recording = isRecording
    bridgeState.updatedAt = new Date().toISOString()
    addEvent('OBS_RECORDING_CHANGED', `OBS Recording ${isRecording ? 'STARTED 🔴' : 'STOPPED ⏹️'}`)
  }
})

obs.on('StreamStateChanged', (data) => {
  const isStreaming = data.outputActive
  if (bridgeState.obs.streaming !== isStreaming) {
    bridgeState.obs.streaming = isStreaming
    bridgeState.updatedAt = new Date().toISOString()
    addEvent('OBS_STREAMING_CHANGED', `OBS Streaming ${isStreaming ? 'LIVE 📡' : 'OFFLINE ⚪'}`)
  }
})

// Phase 8.1: OBS Transition Tracking & Lock State
obs.on('SceneTransitionStarted', (data) => {
  bridgeState.manualControl.transitionLocked = true
  bridgeState.updatedAt = new Date().toISOString()
})

obs.on('SceneTransitionEnded', (data) => {
  bridgeState.manualControl.transitionLocked = false
  if (transitionLockTimeout) {
    clearTimeout(transitionLockTimeout)
    transitionLockTimeout = null
  }
  bridgeState.updatedAt = new Date().toISOString()
})

let transitionLockTimeout = null

async function triggerObsStudioTransition(source = 'ATEM_MACRO') {
  const mc = bridgeState.manualControl
  if (!mc.enabled) {
    addEvent('OBS_TRANSITION_BLOCKED', 'OBS Transition blocked: MANUAL_CONTROL is disabled', { reason: 'DISABLED' })
    return { success: false, reason: 'DISABLED' }
  }

  if (!bridgeState.obsConnected) {
    addEvent('OBS_TRANSITION_BLOCKED', 'OBS Transition blocked: OBS WebSocket is disconnected', { reason: 'OBS_DISCONNECTED' })
    return { success: false, reason: 'OBS_DISCONNECTED' }
  }

  if (!bridgeState.obs.studioMode) {
    addEvent('OBS_TRANSITION_BLOCKED', 'OBS Transition blocked: OBS Studio Mode is OFF', { reason: 'STUDIO_MODE_OFF' })
    return { success: false, reason: 'STUDIO_MODE_OFF' }
  }

  if (mc.transitionLocked) {
    addEvent('OBS_TRANSITION_BLOCKED', 'OBS Transition blocked: Transition is already running or locked (double-press protection)', { reason: 'ALREADY_LOCKED' })
    return { success: false, reason: 'ALREADY_LOCKED' }
  }

  // Lock trigger immediately
  mc.transitionLocked = true
  mc.lastTriggeredAt = new Date().toISOString()
  bridgeState.updatedAt = new Date().toISOString()

  addEvent('OBS_TRANSITION_TRIGGER_REQUESTED', `OBS Transition requested via ${source}`)

  // Fallback unlock timeout (safety)
  const lockMs = setup.manualControl?.transitionLockMs || 2000
  if (transitionLockTimeout) clearTimeout(transitionLockTimeout)
  transitionLockTimeout = setTimeout(() => {
    if (bridgeState.manualControl.transitionLocked) {
      bridgeState.manualControl.transitionLocked = false
      bridgeState.updatedAt = new Date().toISOString()
    }
  }, lockMs)

  try {
    await obs.call('TriggerStudioModeTransition')
    mc.lastResult = 'SUCCESS'
    bridgeState.updatedAt = new Date().toISOString()
    addEvent('OBS_TRANSITION_TRIGGERED', 'OBS Studio Mode Transition executed successfully')
    return { success: true }
  } catch (err) {
    mc.transitionLocked = false
    mc.lastResult = `FAILED: ${err?.message || err}`
    bridgeState.updatedAt = new Date().toISOString()
    addEvent('OBS_TRANSITION_FAILED', `OBS Transition failed: ${err?.message || err}`, { error: err?.message })
    return { success: false, reason: 'ERROR', error: err?.message }
  }
}

setInterval(() => {
  if (!bridgeState.obsConnected && !obsConnecting) {
    connectOBS()
  }
}, 5000)

connectOBS()

// ============================================================================
// RESOLUME READ-ONLY MODULE & AUTO-POLL
// ============================================================================
function httpGetJson(url, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(timeoutMs, () => {
      req.destroy()
      reject(new Error('Timeout'))
    })
  })
}

async function pollResolume() {
  try {
    const product = await httpGetJson(`${RESOLUME_URL}/product`)
    const comp = await httpGetJson(`${RESOLUME_URL}/composition`)

    const versionStr = product ? `${product.name || 'Arena'} ${product.major || ''}.${product.minor || ''}.${product.micro || ''}`.trim() : 'Resolume'
    const compName = comp?.name?.value || 'Untitled'
    const bpm = comp?.tempocontroller?.tempo?.value != null ? Math.round(comp.tempocontroller.tempo.value) : null

    let activeCol = null
    if (Array.isArray(comp?.columns)) {
      comp.columns.forEach((col, idx) => {
        if (col?.connected?.value) {
          activeCol = col?.name?.value || `Column ${idx + 1}`
        }
      })
    }

    const layers = []
    if (Array.isArray(comp?.layers)) {
      comp.layers.forEach((layer, idx) => {
        const lname = layer?.name?.value || `Layer ${idx + 1}`
        const activeClipObj = (layer?.clips || []).find(c => ['Connected', 'Connected & previewing'].includes(c?.connected?.value))
        const clipName = activeClipObj ? (activeClipObj.name?.value || 'Active Clip') : null
        layers.push({
          id: idx + 1,
          name: lname,
          activeClip: clipName
        })
      })
    }

    if (!bridgeState.resolumeConnected) {
      bridgeState.resolumeConnected = true
      bridgeState.resolume.connected = true
      addEvent('RESOLUME_CONNECTED', `Resolume connected (${versionStr})`)
      console.log('RESOLUME CONNECTED ✅')
    }

    bridgeState.resolume.version = versionStr

    if (bridgeState.resolume.compositionName !== compName) {
      const oldComp = bridgeState.resolume.compositionName
      bridgeState.resolume.compositionName = compName
      if (oldComp !== null) {
        addEvent('RESOLUME_COMPOSITION_CHANGED', `Resolume composition changed: ${oldComp} → ${compName}`)
      }
    }

    bridgeState.resolume.bpm = bpm

    if (bridgeState.resolume.activeColumn !== activeCol) {
      const oldCol = bridgeState.resolume.activeColumn
      bridgeState.resolume.activeColumn = activeCol
      if (oldCol !== null && activeCol !== null) {
        addEvent('RESOLUME_COLUMN_CHANGED', `Resolume column changed: ${oldCol || 'None'} → ${activeCol || 'None'}`)
      }
    }

    const prevLayers = bridgeState.resolume.layers || []
    layers.forEach((l, idx) => {
      const prevL = prevLayers[idx]
      if (prevL && prevL.activeClip !== l.activeClip) {
        const oldClip = prevL.activeClip || 'NONE'
        const newClip = l.activeClip || 'NONE'
        addEvent('RESOLUME_CLIP_CHANGED', `Resolume [${l.name}] clip: ${oldClip} → ${newClip}`)
      }
    })

    bridgeState.resolume.layers = layers
    bridgeState.updatedAt = new Date().toISOString()

  } catch (err) {
    if (bridgeState.resolumeConnected) {
      bridgeState.resolumeConnected = false
      bridgeState.resolume.connected = false
      bridgeState.resolume.version = null
      bridgeState.resolume.compositionName = null
      bridgeState.resolume.bpm = null
      bridgeState.resolume.activeColumn = null
      bridgeState.resolume.layers = []
      addEvent('RESOLUME_DISCONNECTED', 'Resolume disconnected')
      console.log('RESOLUME DISCONNECTED ❌')
    }
  }
}

setInterval(pollResolume, 1000)
pollResolume()

// ============================================================================
// DECKLINK READ-ONLY MODULE & NON-OVERLAPPING DAEMON POLLING
// ============================================================================
let isDecklinkPolling = false

function pollDecklink() {
  if (isDecklinkPolling) return
  isDecklinkPolling = true

  execFile(DECKLINK_MONITOR_BIN, ['--json'], { timeout: 3000 }, (error, stdout) => {
    isDecklinkPolling = false

    if (error || !stdout) {
      if (bridgeState.decklinkConnected) {
        bridgeState.decklinkConnected = false
        bridgeState.decklink.connected = false
        bridgeState.decklink.channels = {}
        addEvent('DECKLINK_DISCONNECTED', 'DeckLink hardware monitoring disconnected')
        console.log('DECKLINK DISCONNECTED ❌')
      }
      return
    }

    try {
      const data = JSON.parse(stdout)
      const isConnected = !!data.connected
      const newChannels = data.channels || {}

      if (!bridgeState.decklinkConnected && isConnected) {
        bridgeState.decklinkConnected = true
        bridgeState.decklink.connected = true
        addEvent('DECKLINK_CONNECTED', 'DeckLink Quad 2 connected (8 SDI channels)')
        console.log('DECKLINK CONNECTED ✅')
      }

      const prevChannels = bridgeState.decklink.channels || {}

      Object.keys(newChannels).forEach(key => {
        const newCh = newChannels[key]
        const prevCh = prevChannels[key]

        if (prevCh) {
          if (!prevCh.signalLocked && newCh.signalLocked) {
            addEvent('DECKLINK_SIGNAL_DETECTED', `DeckLink [${newCh.physicalInputId}] signal locked: ${newCh.inputFormat} (${newCh.directionState})`)
          } else if (prevCh.signalLocked && !newCh.signalLocked) {
            addEvent('DECKLINK_SIGNAL_LOST', `DeckLink [${newCh.physicalInputId}] signal lost`)
          } else if (newCh.signalLocked && prevCh.inputFormat !== newCh.inputFormat) {
            addEvent('DECKLINK_FORMAT_CHANGED', `DeckLink [${newCh.physicalInputId}] format changed: ${prevCh.inputFormat} → ${newCh.inputFormat}`)
          }
        }
      })

      bridgeState.decklink.channels = newChannels
      bridgeState.updatedAt = new Date().toISOString()

    } catch (parseErr) {
      console.error('Error parsing DeckLink JSON:', parseErr.message)
    }
  })
}

setInterval(pollDecklink, 2000)
pollDecklink()

// ============================================================================
// HUDL PRODUCTION TRUCK READ-ONLY MONITOR MODULE
// ============================================================================
const TRUCK_LOG_DIR = path.join(os.homedir(), 'Documents', 'Production Truck', 'logs')
let currentLogFile = null
let lastLogOffset = 0
let lastLogActivityTime = 0
let lastRenderActivityTime = 0
let lastReplayActivityTime = 0

function getLatestTruckLogFile() {
  try {
    if (!fs.existsSync(TRUCK_LOG_DIR)) return null
    const files = fs.readdirSync(TRUCK_LOG_DIR)
      .filter(f => f.startsWith('com.hudl.Production-Truck') && f.endsWith('.log'))
      .map(f => {
        const fullPath = path.join(TRUCK_LOG_DIR, f)
        const stat = fs.statSync(fullPath)
        return { path: fullPath, mtime: stat.mtimeMs, size: stat.size }
      })
      .sort((a, b) => b.mtime - a.mtime)

    return files.length > 0 ? files[0] : null
  } catch {
    return null
  }
}

function pollTruck() {
  // 1. Process Check
  exec("pgrep -f 'Production Truck.app'", (error, stdout) => {
    const isRunning = !error && stdout.trim().length > 0

    if (isRunning !== bridgeState.truck.running) {
      bridgeState.truck.running = isRunning
      if (isRunning) {
        if (!bridgeState.truckConnected) {
          bridgeState.truckConnected = true
          bridgeState.truck.connected = true
          addEvent('TRUCK_CONNECTED', 'Hudl Production Truck process detected (v4.15.0)')
          console.log('HUDL PRODUCTION TRUCK CONNECTED ✅')
        }
      } else {
        if (bridgeState.truckConnected) {
          bridgeState.truckConnected = false
          bridgeState.truck.connected = false
          bridgeState.truck.outputPresent = { value: false, confidence: 'UNKNOWN' }
          bridgeState.truck.replayReady = { value: null, confidence: 'UNKNOWN' }
          bridgeState.truck.replaySource = { value: null, confidence: 'UNKNOWN' }
          addEvent('TRUCK_DISCONNECTED', 'Hudl Production Truck process closed')
          console.log('HUDL PRODUCTION TRUCK DISCONNECTED ❌')
        }
        return
      }
    }

    if (!isRunning) return

    // 2. Read-Only Log Tailer
    const latestLog = getLatestTruckLogFile()
    if (!latestLog) return

    if (currentLogFile !== latestLog.path) {
      currentLogFile = latestLog.path
      lastLogOffset = Math.max(0, latestLog.size - 20000) // start tailing near end of new log
    }

    try {
      const stats = fs.statSync(currentLogFile)
      if (stats.size > lastLogOffset) {
        const fd = fs.openSync(currentLogFile, 'r')
        const bufferSize = stats.size - lastLogOffset
        const buffer = Buffer.alloc(bufferSize)
        fs.readSync(fd, buffer, 0, bufferSize, lastLogOffset)
        fs.closeSync(fd)

        lastLogOffset = stats.size
        lastLogActivityTime = Date.now()
        bridgeState.truck.lastActivityAt = new Date().toISOString()

        const logChunk = buffer.toString('utf8')
        const lines = logChunk.split('\n')

        lines.forEach(line => {
          if (!line.trim()) return

          // Output presence signal
          if (line.includes('video capture rate') || line.includes('VideoMixer rate') || line.includes('VideoInputFrameArrived: capture')) {
            lastRenderActivityTime = Date.now()
            if (!bridgeState.truck.outputPresent.value) {
              bridgeState.truck.outputPresent = { value: true, confidence: 'INFERRED' }
              addEvent('TRUCK_OUTPUT_STARTED', 'Production Truck active render output detected (Inferred)')
            }
          }

          // Replay ready signal
          if (line.includes('Replay trigger') || line.includes('replay_clip_cache') || line.includes('Replay clip saved')) {
            lastReplayActivityTime = Date.now()
            bridgeState.truck.replayReady = { value: true, confidence: 'INFERRED' }

            if (line.includes('[Camera 1]')) {
              bridgeState.truck.replaySource = { value: 'Camera 1', confidence: 'INFERRED' }
            } else if (line.includes('[Camera 2]')) {
              bridgeState.truck.replaySource = { value: 'Camera 2', confidence: 'INFERRED' }
            }
          }
        })
      }
    } catch (logErr) {
      // Catch read errors silently for non-blocking operation
    }

    // 3. Stale Data Protection Check (10s timeout)
    const now = Date.now()
    if (bridgeState.truck.outputPresent.value && (now - lastRenderActivityTime > 10000)) {
      bridgeState.truck.outputPresent = { value: false, confidence: 'UNKNOWN' }
      addEvent('TRUCK_OUTPUT_STOPPED', 'Production Truck active output stopped (Stale Timeout)')
    }

    if (bridgeState.truck.replayReady.value !== null && (now - lastReplayActivityTime > 10000)) {
      bridgeState.truck.replayReady = { value: null, confidence: 'UNKNOWN' }
      bridgeState.truck.replaySource = { value: null, confidence: 'UNKNOWN' }
    }

    bridgeState.updatedAt = new Date().toISOString()
  })
}

setInterval(pollTruck, 3000)
pollTruck()

// ============================================================================
// GRAPHICS CROSS-PROCESS STATE & SSE (Phase G6.3 & Phase G-SYNC1)
// ============================================================================
let sseClients = []

function createDefaultBridgeGraphics() {
  return {
    version: '1.0',
    activeGraphic: 'SCOREBUG',
    preparedGraphic: null,
    visibility: {
      scorebug: false,
      playerLowerThird: false,
      startingLineup: false,
      playerStats: false,
      setResult: false,
      matchResult: false
    },
    prepared: {
      playerLowerThird: { team: 'home', playerId: 'h7', playerIndex: 0 },
      startingLineup: { team: 'home' },
      playerStats: { team: 'home', playerId: 'h7', playerIndex: 0 },
      setResult: { setNumber: 1 },
      matchResult: {}
    },
    transitionState: 'VISIBLE',
    language: 'en',
    lastGraphicAction: 'INIT',
    stateRevision: 1,
    lastActionTimestamp: Date.now()
  }
}

function normalizeGraphicsPayload(raw) {
  if (!raw || typeof raw !== 'object') return null
  const src = raw.graphics || raw
  const vis = src.visibility || raw.visibility || {}
  const prep = src.prepared || raw.prepared || {}

  // Ingestion migration: normalize legacy 'stats' -> 'playerStats'
  const playerStatsVis = Boolean(vis.playerStats !== undefined ? vis.playerStats : (vis.stats !== undefined ? vis.stats : false))
  const pStatsPrep = prep.playerStats || prep.stats || { team: 'home', playerId: 'h7', playerIndex: 0 }

  const normalizedGfx = {
    version: src.version || '1.0',
    activeGraphic: src.activeGraphic || (vis.scorebug ? 'SCOREBUG' : null),
    preparedGraphic: src.preparedGraphic || null,
    visibility: {
      scorebug: Boolean(vis.scorebug ?? false),
      playerLowerThird: Boolean(vis.playerLowerThird ?? false),
      startingLineup: Boolean(vis.startingLineup ?? false),
      playerStats: playerStatsVis,
      setResult: Boolean(vis.setResult ?? false),
      matchResult: Boolean(vis.matchResult ?? false)
    },
    prepared: {
      playerLowerThird: prep.playerLowerThird || { team: 'home', playerId: 'h7', playerIndex: 0 },
      startingLineup: prep.startingLineup || { team: 'home' },
      playerStats: {
        team: pStatsPrep.team || 'home',
        playerId: pStatsPrep.playerId || 'h7',
        playerIndex: Number(pStatsPrep.playerIndex) || 0
      },
      setResult: prep.setResult || { setNumber: 1 },
      matchResult: prep.matchResult || {}
    },
    transitionState: src.transitionState || 'VISIBLE',
    language: src.language || 'en',
    lastGraphicAction: raw.action || src.lastGraphicAction || 'UPDATE',
    stateRevision: Number(src.stateRevision) || (bridgeState.graphicsState?.graphics?.stateRevision || 0) + 1,
    lastActionTimestamp: Date.now()
  }

  return normalizedGfx
}

const initialGfx = createDefaultBridgeGraphics()
bridgeState.graphicsState = {
  match: null,
  graphics: initialGfx,
  visibility: initialGfx.visibility,
  prepared: initialGfx.prepared,
  roster: null,
  activeGame: null,
  timestamp: Date.now()
}

function broadcastGraphicsUpdate(sourceAction) {
  const payload = JSON.stringify({
    type: 'GRAPHICS_STATE_UPDATE',
    action: sourceAction || 'STATE_SYNC',
    state: bridgeState.graphicsState,
    timestamp: Date.now()
  })
  sseClients.forEach(client => {
    try {
      client.write(`data: ${payload}\n\n`)
    } catch (e) {}
  })
}

// ============================================================================
// HTTP SERVER & ATEM HANDLERS
// ============================================================================
const server = http.createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  response.setHeader('Content-Type', 'application/json')

  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  if (request.method === 'GET' && request.url === '/status') {
    response.writeHead(200)
    response.end(JSON.stringify(bridgeState, null, 2))
    return
  }

  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200)
    response.end(JSON.stringify({
      bridge: 'ONLINE',
      atemConnected: bridgeState.atemConnected,
      obsConnected: bridgeState.obsConnected,
      resolumeConnected: bridgeState.resolumeConnected,
      decklinkConnected: bridgeState.decklinkConnected,
      truckConnected: bridgeState.truckConnected
    }, null, 2))
    return
  }

  if (request.method === 'GET' && request.url === '/events') {
    response.writeHead(200)
    response.end(JSON.stringify({
      events: bridgeState.events
    }, null, 2))
    return
  }

  // Phase G6.3: Graphics State REST Endpoint
  if (request.method === 'GET' && request.url === '/graphics/state') {
    response.writeHead(200)
    response.end(JSON.stringify(bridgeState.graphicsState, null, 2))
    return
  }

  // Phase G6.3: Graphics State SSE Stream Endpoint
  if (request.method === 'GET' && request.url === '/graphics/events') {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    })
    const initialPayload = JSON.stringify({
      type: 'GRAPHICS_STATE_INITIAL',
      state: bridgeState.graphicsState,
      timestamp: Date.now()
    })
    response.write(`data: ${initialPayload}\n\n`)
    sseClients.push(response)

    request.on('close', () => {
      sseClients = sseClients.filter(c => c !== response)
    })
    return
  }

  // Phase G6.3 & Phase G-SYNC1: Graphics State Mutation (Presentation & Match Safe Sync)
  if (request.method === 'POST' && request.url === '/graphics/state') {
    let body = ''
    request.on('data', chunk => { body += chunk })
    request.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}')
        const normalizedGfx = normalizeGraphicsPayload(payload)
        if (normalizedGfx) {
          bridgeState.graphicsState.graphics = normalizedGfx
          bridgeState.graphicsState.visibility = normalizedGfx.visibility
          bridgeState.graphicsState.prepared = normalizedGfx.prepared
        }
        if (payload.match !== undefined) bridgeState.graphicsState.match = payload.match
        if (payload.roster !== undefined) bridgeState.graphicsState.roster = payload.roster
        if (payload.activeGame !== undefined) bridgeState.graphicsState.activeGame = payload.activeGame
        bridgeState.graphicsState.timestamp = Date.now()

        broadcastGraphicsUpdate(payload.action || normalizedGfx?.lastGraphicAction || 'GRAPHICS_UPDATE')

        response.writeHead(200)
        response.end(JSON.stringify({
          success: true,
          action: payload.action || normalizedGfx?.lastGraphicAction || 'GRAPHICS_UPDATE',
          visibility: bridgeState.graphicsState.visibility,
          prepared: bridgeState.graphicsState.prepared,
          timestamp: bridgeState.graphicsState.timestamp
        }))
      } catch (err) {
        response.writeHead(400)
        response.end(JSON.stringify({ error: err?.message }))
      }
    })
    return
  }

  // Phase 8.1: Controlled Manual Trigger endpoint (for testing or UI manual triggers)
  if (request.method === 'POST' && request.url === '/control/obs-transition') {
    triggerObsStudioTransition('API_TRIGGER').then((res) => {
      response.writeHead(res.success ? 200 : 400)
      response.end(JSON.stringify({
        ...res,
        manualControl: bridgeState.manualControl
      }, null, 2))
    }).catch((err) => {
      response.writeHead(500)
      response.end(JSON.stringify({ error: err?.message }, null, 2))
    })
    return
  }

  response.writeHead(404)
  response.end(JSON.stringify({
    error: 'Not found',
    availableEndpoints: ['/status', '/health', '/events', '/graphics/state', '/graphics/events', '/control/obs-transition']
  }, null, 2))
})

// ============================================================================
// ATEM MACRO EDGE DETECTION & HANDLERS (Phase 8.1)
// ============================================================================
let lastAtemMacroRunning = false
let atemMacroStateInitialized = false

function handleAtemMacroStateChange(macroPlayer) {
  if (!macroPlayer) return

  const isRunning = Boolean(macroPlayer.isRunning)
  const macroIndex = Number(macroPlayer.macroIndex)
  const targetIndex = Number(bridgeState.manualControl.obsTransitionMacroIndex)

  // Initialization safeguard: capture initial state on sync without triggering
  if (!atemMacroStateInitialized) {
    lastAtemMacroRunning = isRunning
    atemMacroStateInitialized = true
    return
  }

  // Detect rising edge: false -> true
  if (isRunning && !lastAtemMacroRunning) {
    console.log(`ATEM Macro execution detected: Macro index ${macroIndex} (configured target: ${targetIndex})`)
    if (macroIndex === targetIndex) {
      triggerObsStudioTransition(`ATEM_MACRO_${macroIndex + 1}`)
    }
  }

  lastAtemMacroRunning = isRunning
}

atem.on('error', (err) => {
  console.error('ATEM ERROR:', err)
})

atem.on('connected', () => {
  bridgeState.atemConnected = true

  // Safeguard: Initialize macro edge detector on connection without firing
  atemMacroStateInitialized = false
  if (atem.state?.macro?.macroPlayer) {
    lastAtemMacroRunning = Boolean(atem.state.macro.macroPlayer.isRunning)
    atemMacroStateInitialized = true
  }

  addEvent(
    'ATEM_CONNECTED',
    'ATEM connected'
  )

  console.log('ATEM CONNECTED ✅')
  updateAtemState(atem.state)
})

atem.on('disconnected', () => {
  bridgeState.atemConnected = false
  atemMacroStateInitialized = false
  lastAtemMacroRunning = false
  bridgeState.updatedAt = new Date().toISOString()

  addEvent(
    'ATEM_DISCONNECTED',
    'ATEM disconnected'
  )

  console.log('ATEM DISCONNECTED ❌')
})

atem.on('stateChanged', (state, pathToChange) => {
  updateAtemState(state)

  if (pathToChange && pathToChange.some(p => p.startsWith('macro.macroPlayer') || p === 'macro.macroPlayer')) {
    handleAtemMacroStateChange(state.macro?.macroPlayer)
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Production Bridge API: http://localhost:${PORT}/status`)
  console.log(`Health check: http://localhost:${PORT}/health`)
  console.log(`Events: http://localhost:${PORT}/events`)
})

console.log('Loading profile:', setup.profile)
console.log('Connecting to ATEM:', ATEM_IP)

atem.connect(ATEM_IP)
