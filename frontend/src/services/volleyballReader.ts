import type { VolleyballMatchState, VolleyballObservabilityStatus } from '../types/volleyball';

const STORAGE_KEY = 'mdcVolleyballMatchStateV1';
const CHANNEL_NAME = 'mdc-volleyball-live-state';

/**
 * Defensive validator for incoming Volleyball Control2 state JSON.
 */
function isValidVolleyballState(data: any): data is VolleyballMatchState {
  if (!data || typeof data !== 'object') return false;
  if (!data.teamHome || typeof data.teamHome !== 'object') return false;
  if (!data.teamAway || typeof data.teamAway !== 'object') return false;
  if (typeof data.teamHome.name !== 'string' || typeof data.teamAway.name !== 'string') return false;
  if (typeof data.teamHome.currentPoints !== 'number' || typeof data.teamAway.currentPoints !== 'number') return false;
  if (typeof data.currentSet !== 'number') return false;
  return true;
}

/**
 * Strictly Passive Volleyball Control2 Reader Service.
 * Performs NO write operations (no setItem, removeItem, clear, postMessage).
 * Only reads localStorage and listens to BroadcastChannel & storage events.
 */
export function subscribeVolleyballObservability(
  onUpdate: (status: VolleyballObservabilityStatus) => void
): () => void {
  let isMounted = true;
  let broadcastChannel: BroadcastChannel | null = null;

  // Defensive Check: Try reading localStorage once safely
  let initialRaw: string | null = null;
  let accessDenied = false;

  try {
    initialRaw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    accessDenied = true;
  }

  if (accessDenied) {
    onUpdate({
      isSameOrigin: false,
      hasData: false,
      matchState: null,
      lastReceivedAt: null,
      errorMessage: 'Observación de voleibol no disponible: requiere mismo origen'
    });
    return () => {};
  }

  // Parse initial state if present
  let currentState: VolleyballMatchState | null = null;
  let lastReceivedAt: number | null = null;

  if (initialRaw) {
    try {
      const parsed = JSON.parse(initialRaw);
      if (isValidVolleyballState(parsed)) {
        currentState = parsed;
        lastReceivedAt = parsed.timestamp || Date.now();
      }
    } catch (e) {
      console.warn('Failed to parse initial Volleyball Control2 state:', e);
    }
  }

  // Notify initial state
  onUpdate({
    isSameOrigin: true,
    hasData: Boolean(currentState),
    matchState: currentState,
    lastReceivedAt,
    errorMessage: currentState ? undefined : 'Marcador externo sin actividad'
  });

  // Listener for BroadcastChannel (Passive receiver ONLY)
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    broadcastChannel.onmessage = (event) => {
      if (!isMounted) return;
      if (event.data && event.data.type === 'STATE_UPDATE' && isValidVolleyballState(event.data.state)) {
        const newState = event.data.state;
        onUpdate({
          isSameOrigin: true,
          hasData: true,
          matchState: newState,
          lastReceivedAt: Date.now()
        });
      }
    };
  } catch (e) {
    console.warn('BroadcastChannel not supported or restricted:', e);
  }

  // Listener for storage events (Passive receiver ONLY)
  const handleStorageChange = (e: StorageEvent) => {
    if (!isMounted) return;
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (isValidVolleyballState(parsed)) {
          onUpdate({
            isSameOrigin: true,
            hasData: true,
            matchState: parsed,
            lastReceivedAt: Date.now()
          });
        }
      } catch (err) {
        console.warn('Failed to parse storage event Volleyball state:', err);
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);

  // Cleanup function
  return () => {
    isMounted = false;
    if (broadcastChannel) {
      try {
        broadcastChannel.close();
      } catch (e) {}
    }
    window.removeEventListener('storage', handleStorageChange);
  };
}
