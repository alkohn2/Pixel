/**
 * DEPRECATED RUNTIME CLIENT (PIXEL Phase 6.6)
 * Direct browser Resolume REST polling is deprecated.
 * All live Resolume telemetry is now consumed centrally from Production Bridge GET /status (:3000).
 * Keep config helper functions for profile credential storage.
 */

export interface ResolumeStatusData {
  connected: boolean;
  productName?: string;
  version?: string;
  compositionName?: string;
  compositionDetected?: boolean;
  errorMessage?: string;
  errorType?: 'unreachable' | 'disabled' | 'incompatible' | 'timeout' | 'unknown';
}

export interface ResolumeConfig {
  host: string;
  port: number;
}

const LOCAL_STORAGE_KEY_RESOLUME_CONFIG = 'vento_v1_resolume_config_v1';

export function loadResolumeConfig(): ResolumeConfig {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY_RESOLUME_CONFIG);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load Resolume config:', e);
    }
  }
  return { host: '127.0.0.1', port: 8080 };
}

export function saveResolumeConfig(config: ResolumeConfig): void {
  localStorage.setItem(LOCAL_STORAGE_KEY_RESOLUME_CONFIG, JSON.stringify({
    host: config.host || '127.0.0.1',
    port: config.port || 8080
  }));
}

/**
 * Strictly Read-Only Resolume Arena Client & Diagnostic Tester.
 * Performs passive HTTP GET / WebSocket read of initial state.
 * Sends ZERO control, write, trigger, or OSC commands.
 */
export async function testResolumeConnection(
  host: string,
  port: number
): Promise<ResolumeStatusData> {
  const targetHost = host.trim() || '127.0.0.1';
  const targetPort = port || 8080;
  const baseUrl = `http://${targetHost}:${targetPort}/api/v1`;

  // Strategy 1: HTTP GET /api/v1/product and /api/v1/composition
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const productResp = await fetch(`${baseUrl}/product`, {
      method: 'GET',
      signal: controller.signal
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (productResp && productResp.ok) {
      let productName = 'Resolume Arena';
      let version = 'v7.x';
      let compositionName = '';
      let detected = false;

      try {
        const prodData = await productResp.json();
        if (prodData) {
          productName = prodData.name || prodData.product || 'Resolume Arena';
          if (prodData.major !== undefined) {
            version = `v${prodData.major}.${prodData.minor || 0}.${prodData.micro || 0}`;
          } else if (prodData.version) {
            version = `v${prodData.version}`;
          }
        }
      } catch (e) {
        // Non-fatal json parse error
      }

      // Read composition info (passive GET)
      try {
        const compController = new AbortController();
        const compTimeoutId = setTimeout(() => compController.abort(), 2000);

        const compResp = await fetch(`${baseUrl}/composition`, {
          method: 'GET',
          signal: compController.signal
        }).catch(() => null);

        clearTimeout(compTimeoutId);

        if (compResp && compResp.ok) {
          const compData = await compResp.json();
          if (compData) {
            detected = true;
            if (typeof compData.name === 'string') {
              compositionName = compData.name;
            } else if (compData.name && typeof compData.name.value === 'string') {
              compositionName = compData.name.value;
            } else if (compData.composition && typeof compData.composition.name === 'string') {
              compositionName = compData.composition.name;
            } else {
              compositionName = 'Composición Activa';
            }
          }
        }
      } catch (e) {
        // Ignore secondary composition fetch error
      }

      return {
        connected: true,
        productName,
        version,
        compositionName: compositionName || 'Composición Abierta',
        compositionDetected: detected
      };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        connected: false,
        errorType: 'timeout',
        errorMessage: `Tiempo de espera agotado (Timeout 3.5s) al consultar http://${targetHost}:${targetPort}`
      };
    }
  }

  // Strategy 2: Passive WebSocket Connection to ws://host:port/api/v1 (Read initial pushed payload)
  return new Promise((resolve) => {
    const wsUrl = `ws://${targetHost}:${targetPort}/api/v1`;
    let socket: WebSocket;

    try {
      socket = new WebSocket(wsUrl);
    } catch (err: any) {
      return resolve({
        connected: false,
        errorType: 'unreachable',
        errorMessage: `WebSocket no accesible: ws://${targetHost}:${targetPort}/api/v1 (${err?.message || 'Error de puerto'})`
      });
    }

    let resolved = false;
    const cleanupAndResolve = (res: ResolumeStatusData) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(wsTimeout);
      try {
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
          socket.close();
        }
      } catch (e) {}
      resolve(res);
    };

    const wsTimeout = setTimeout(() => {
      cleanupAndResolve({
        connected: false,
        errorType: 'timeout',
        errorMessage: `Tiempo de espera agotado (Timeout 4s): Resolume no respondió en ws://${targetHost}:${targetPort}/api/v1`
      });
    }, 4000);

    socket.onopen = () => {
      // Passive: do NOT send any messages, wait for Resolume's initial handshake/state push
    };

    socket.onerror = () => {
      cleanupAndResolve({
        connected: false,
        errorType: 'disabled',
        errorMessage: `Resolume: Sin conexión / No configurado. Verifica que Resolume Arena esté abierto y el Webserver activado en puerto ${targetPort}.`
      });
    };

    socket.onclose = () => {
      if (!resolved) {
        cleanupAndResolve({
          connected: false,
          errorType: 'disabled',
          errorMessage: `Conexión cerrada por Resolume Arena (Puerto ${targetPort})`
        });
      }
    };

    socket.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        let compName = '';
        let detected = false;

        if (data) {
          detected = true;
          if (data.name && typeof data.name.value === 'string') {
            compName = data.name.value;
          } else if (typeof data.name === 'string') {
            compName = data.name;
          }
        }

        cleanupAndResolve({
          connected: true,
          productName: 'Resolume Arena',
          version: 'v7.x',
          compositionName: compName || 'Composición Detectada',
          compositionDetected: detected
        });
      } catch (e) {
        cleanupAndResolve({
          connected: true,
          productName: 'Resolume Arena',
          version: 'v7.x',
          compositionName: 'Composición Activa',
          compositionDetected: true
        });
      }
    };
  });
}
