export interface BridgeInputState {
  input: number;
  name: string;
}

export interface OBSStatusResponse {
  connected: boolean;
  programScene: string | null;
  previewScene: string | null;
  studioMode: boolean;
  recording: boolean;
  streaming: boolean;
}

export interface ResolumeLayerState {
  id: number;
  name: string;
  activeClip: string | null;
}

export interface ResolumeStatusResponse {
  connected: boolean;
  version: string | null;
  compositionName: string | null;
  bpm: number | null;
  activeColumn: string | null;
  layers: ResolumeLayerState[];
}

export interface DeckLinkChannelStatus {
  channelId: number;        // 1 to 8
  channelName: string;      // e.g. "DeckLink Quad (1)"
  physicalInputId: string;  // e.g. "input-1"
  directionState?: 'CAPTURE' | 'PLAYBACK' | 'IDLE';
  signalLocked: boolean;
  inputFormat?: string;     // e.g. "1080p59.94", "720p60", "No Signal"
  pixelFormat?: string;     // e.g. "8-bit YUV 4:2:2"
  lastCheckedAt?: string;
}

export interface DeckLinkStatusData {
  connected: boolean;
  cardModel?: string;
  expectedFormat?: string;
  mapping?: Record<string, string | null>;
  channels: Record<string, DeckLinkChannelStatus>; // Keyed by "input-1" .. "input-8"
  updatedAt?: string;
}

export interface TruckValueConfidence<T> {
  value: T;
  confidence: 'DIRECT' | 'INFERRED' | 'UNKNOWN';
}

export interface TruckStatusResponse {
  connected: boolean;
  running: boolean;
  version: string | null;
  integrationMethod: string;
  outputPresent: TruckValueConfidence<boolean>;
  replayReady: TruckValueConfidence<boolean | null>;
  replaySource: TruckValueConfidence<string | null>;
  lastActivityAt: string | null;
  confidence: 'DIRECT' | 'INFERRED' | 'UNKNOWN';
}

export interface BridgeEvent {
  time: string;
  type: string;
  message: string;
  [key: string]: any;
}

export interface ManualControlStatus {
  enabled: boolean;
  operatorManualLock?: boolean;
  lockReason?: string | null;
  mode: string;
  obsTransitionMacroIndex: number;
  transitionLocked: boolean;
  lastTriggeredAt: string | null;
  lastResult: string | null;
}

export async function setPixelRemoteState(action: 'ARM' | 'LOCK' | 'TOGGLE'): Promise<ManualControlStatus | null> {
  try {
    const response = await fetch('http://127.0.0.1:3000/control/pixel-remote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    if (response.ok) {
      const data = await response.json();
      return data.manualControl;
    }
  } catch (err) {
    console.error('Failed to set PIXEL REMOTE state:', err);
  }
  return null;
}

export interface BridgeStatusResponse {
  connected?: boolean;
  bridge?: string;
  atemConnected?: boolean;
  obsConnected?: boolean;
  resolumeConnected?: boolean;
  decklinkConnected?: boolean;
  truckConnected?: boolean;
  profile?: string;
  program: BridgeInputState;
  preview: BridgeInputState;
  obs?: OBSStatusResponse;
  resolume?: ResolumeStatusResponse;
  decklink?: DeckLinkStatusData;
  truck?: TruckStatusResponse;
  manualControl?: ManualControlStatus;
  events?: BridgeEvent[];
  updatedAt?: string;
  fetchedAt?: number;
}

const BRIDGE_STATUS_URL = 'http://127.0.0.1:3000/status';

/**
 * Strictly Read-Only client for querying Production Bridge status.
 * Only sends GET requests to /status.
 */
export async function fetchBridgeStatus(): Promise<BridgeStatusResponse | null> {
  try {
    const fetchTime = Date.now();
    const response = await fetch(BRIDGE_STATUS_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`[BridgeClient] Non-OK HTTP status: ${response.status}`);
      return null;
    }

    const data: BridgeStatusResponse = await response.json();
    data.fetchedAt = fetchTime;
    data.connected = true;

    return data;
  } catch (error) {
    return null;
  }
}
