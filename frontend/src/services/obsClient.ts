/**
 * DEPRECATED RUNTIME CLIENT (PIXEL Phase 6.6)
 * Direct browser OBS WebSocket connections are deprecated.
 * All live OBS telemetry is now consumed centrally from Production Bridge GET /status (:3000).
 * Keep config helper functions for profile credential storage.
 */

export interface OBSStatusData {
  connected: boolean;
  obsVersion?: string;
  currentScene?: string;
  isStreaming?: boolean;
  isRecording?: boolean;
  errorMessage?: string;
  errorType?: 'unreachable' | 'auth_failed' | 'incompatible' | 'timeout' | 'unknown';
}

export interface OBSConfig {
  host: string;
  port: number;
}

const LOCAL_STORAGE_KEY_OBS_CONFIG = 'vento_v1_obs_config_v1';

export function loadOBSConfig(): OBSConfig {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY_OBS_CONFIG);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load OBS config:', e);
    }
  }
  return { host: '127.0.0.1', port: 4455 };
}

export function saveOBSConfig(config: OBSConfig): void {
  localStorage.setItem(LOCAL_STORAGE_KEY_OBS_CONFIG, JSON.stringify({
    host: config.host || '127.0.0.1',
    port: config.port || 4455
  }));
}

/**
 * SHA-256 Base64 helper for OBS WebSocket 5.x authentication hash calculation.
 * Formula: secret = base64(sha256(password + salt))
 *          auth = base64(sha256(secret + challenge))
 * Sensitive data is processed transiently in Web Crypto API memory.
 */
async function sha256Base64(inputString: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(inputString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hashBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Strictly Read-Only OBS WebSocket 5.x Client & Diagnostic Tester.
 * Sends ZERO write/control requests.
 */
export function testOBSConnection(
  host: string,
  port: number,
  password?: string
): Promise<OBSStatusData> {
  return new Promise((resolve) => {
    let resolved = false;

    const cleanupAndResolve = (result: OBSStatusData) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      try {
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
          socket.close();
        }
      } catch (e) {
        // Ignore close errors
      }
      resolve(result);
    };

    const targetHost = host.trim() || '127.0.0.1';
    const targetPort = port || 4455;
    const wsUrl = `ws://${targetHost}:${targetPort}`;

    let socket: WebSocket;

    try {
      socket = new WebSocket(wsUrl);
    } catch (err: any) {
      return cleanupAndResolve({
        connected: false,
        errorType: 'unreachable',
        errorMessage: `WebSocket no accesible: La URL ws://${targetHost}:${targetPort} no es válida (${err?.message || 'Error de sintaxis'})`
      });
    }

    const timeoutId = setTimeout(() => {
      cleanupAndResolve({
        connected: false,
        errorType: 'timeout',
        errorMessage: `Tiempo de espera agotado (Timeout 4s): No se obtuvo respuesta de ws://${targetHost}:${targetPort}`
      });
    }, 4000);

    let helloReceived = false;
    let obsVersion = 'v5.x';
    let currentScene = '';
    let isStreaming = false;
    let isRecording = false;
    const receivedRequests = new Set<string>();

    socket.onopen = () => {
      // TCP Socket connected, waiting for Opcode 0 (Hello)
    };

    socket.onerror = () => {
      if (!helloReceived) {
        cleanupAndResolve({
          connected: false,
          errorType: 'unreachable',
          errorMessage: `WebSocket no accesible: No se pudo establecer conexión TCP con ws://${targetHost}:${targetPort}. Verifica que OBS Studio esté abierto y WebSocket v5 habilitado.`
        });
      }
    };

    socket.onclose = (event: CloseEvent) => {
      if (resolved) return;

      const code = event.code;
      const reason = event.reason || '';

      // OBS WebSocket v5 Specific Close Codes
      if (code === 4006 || code === 4009 || reason.toLowerCase().includes('auth') || reason.toLowerCase().includes('identify')) {
        cleanupAndResolve({
          connected: false,
          errorType: 'auth_failed',
          errorMessage: 'Autenticación fallida: La contraseña ingresada no es correcta o OBS requiere contraseña'
        });
      } else if (code === 4007) {
        cleanupAndResolve({
          connected: false,
          errorType: 'incompatible',
          errorMessage: 'Protocolo incompatible: OBS WebSocket requiere una versión de RPC no soportada'
        });
      } else if (code === 1006 || !helloReceived) {
        cleanupAndResolve({
          connected: false,
          errorType: 'unreachable',
          errorMessage: `WebSocket no accesible: Conexión rechazada por ws://${targetHost}:${targetPort}. Revisa IP/Puerto y que el servidor WebSocket esté activo en OBS.`
        });
      } else {
        cleanupAndResolve({
          connected: false,
          errorType: 'unknown',
          errorMessage: `Conexión cerrada por OBS (Código ${code}${reason ? `: ${reason}` : ''})`
        });
      }
    };

    socket.onmessage = async (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        const op = msg.op; // Opcode

        if (op === 0) {
          // Opcode 0: Hello from OBS WebSocket v5
          helloReceived = true;
          const helloData = msg.d;
          obsVersion = helloData.obsWebSocketVersion || 'v5.x';

          let authResponse: string | undefined = undefined;

          if (helloData.authentication) {
            // OBS Requires Authentication
            if (!password || !password.trim()) {
              return cleanupAndResolve({
                connected: false,
                errorType: 'auth_failed',
                errorMessage: 'Autenticación requerida: OBS tiene la autenticación activada pero el campo de contraseña está vacío'
              });
            }

            try {
              const salt = helloData.authentication.salt;
              const challenge = helloData.authentication.challenge;

              const secretHash = await sha256Base64(password + salt);
              authResponse = await sha256Base64(secretHash + challenge);
            } catch (authErr) {
              return cleanupAndResolve({
                connected: false,
                errorType: 'auth_failed',
                errorMessage: 'Error al procesar el hash de autenticación SHA-256'
              });
            }
          }

          // Send Opcode 1: Identify (Read-Only mode, eventSubscriptions: 0)
          const identifyMsg: any = {
            op: 1,
            d: {
              rpcVersion: 1,
              eventSubscriptions: 0
            }
          };

          if (authResponse) {
            identifyMsg.d.authentication = authResponse;
          }

          socket.send(JSON.stringify(identifyMsg));
        } else if (op === 2) {
          // Opcode 2: Identified successfully!
          // Send 4 Strictly Read-Only queries
          const requests = [
            { op: 6, d: { requestType: 'GetVersion', requestId: 'req-ver' } },
            { op: 6, d: { requestType: 'GetCurrentProgramScene', requestId: 'req-scene' } },
            { op: 6, d: { requestType: 'GetStreamStatus', requestId: 'req-stream' } },
            { op: 6, d: { requestType: 'GetRecordStatus', requestId: 'req-record' } }
          ];

          for (const req of requests) {
            socket.send(JSON.stringify(req));
          }
        } else if (op === 7) {
          // Opcode 7: RequestResponse
          const resp = msg.d;
          const reqId = resp.requestId;
          receivedRequests.add(reqId);

          if (resp.requestStatus && resp.requestStatus.result) {
            if (reqId === 'req-ver') {
              obsVersion = resp.responseData?.obsVersion || obsVersion;
            } else if (reqId === 'req-scene') {
              currentScene = resp.responseData?.currentProgramSceneName || resp.responseData?.currentSceneName || 'Desconocida';
            } else if (reqId === 'req-stream') {
              isStreaming = Boolean(resp.responseData?.outputActive);
            } else if (reqId === 'req-record') {
              isRecording = Boolean(resp.responseData?.outputActive);
            }
          }

          // Once all 4 read-only requests or core scene/stream/record responses arrive, complete cleanly
          if (receivedRequests.has('req-scene') && receivedRequests.has('req-stream') && receivedRequests.has('req-record')) {
            cleanupAndResolve({
              connected: true,
              obsVersion,
              currentScene: currentScene || 'Escena Principal',
              isStreaming,
              isRecording
            });
          }
        }
      } catch (err) {
        // Ignore parse error on message
      }
    };
  });
}
