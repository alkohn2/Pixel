import type {
  VolleyballActionType,
  VolleyballCommandPayload,
  VolleyballCommandAck,
  VolleyballAuditLogEntry
} from '../types/volleyball';

const COMMAND_CHANNEL_NAME = 'mdc-volleyball-command-v1';
const ACK_CHANNEL_NAME = 'mdc-volleyball-command-ack-v1';

type AuditLogListener = (log: VolleyballAuditLogEntry[]) => void;
type PendingStateListener = (pendingCommandId: string | null) => void;

class VolleyballControlService {
  private commandChannel: BroadcastChannel | null = null;
  private ackChannel: BroadcastChannel | null = null;
  private auditLog: VolleyballAuditLogEntry[] = [];
  private pendingTimers: Map<string, number> = new Map();
  private auditListeners: Set<AuditLogListener> = new Set();
  private pendingListeners: Set<PendingStateListener> = new Set();
  private currentPendingCommandId: string | null = null;
  private lastDebounceClickTime: number = 0;

  constructor() {
    this.initChannels();
  }

  private initChannels() {
    try {
      this.commandChannel = new BroadcastChannel(COMMAND_CHANNEL_NAME);
      this.ackChannel = new BroadcastChannel(ACK_CHANNEL_NAME);
      this.ackChannel.onmessage = (event) => this.handleAckMessage(event);
    } catch (e) {
      console.warn('BroadcastChannel not available for VolleyballControlService:', e);
    }
  }

  public subscribeAuditLog(listener: AuditLogListener): () => void {
    this.auditListeners.add(listener);
    listener([...this.auditLog]);
    return () => {
      this.auditListeners.delete(listener);
    };
  }

  public subscribePendingState(listener: PendingStateListener): () => void {
    this.pendingListeners.add(listener);
    listener(this.currentPendingCommandId);
    return () => {
      this.pendingListeners.delete(listener);
    };
  }

  private notifyAuditLog() {
    const copy = [...this.auditLog];
    this.auditListeners.forEach((fn) => fn(copy));
  }

  private setPendingCommandId(cmdId: string | null) {
    this.currentPendingCommandId = cmdId;
    this.pendingListeners.forEach((fn) => fn(cmdId));
  }

  private handleAckMessage(event: MessageEvent) {
    const ack = event.data as VolleyballCommandAck;
    if (!ack || typeof ack !== 'object' || !ack.commandId) return;

    const { commandId, status, reason } = ack;
    const timerId = this.pendingTimers.get(commandId);

    if (timerId) {
      clearTimeout(timerId);
      this.pendingTimers.delete(commandId);
    }

    if (this.currentPendingCommandId === commandId) {
      this.setPendingCommandId(null);
    }

    // Update audit log status
    const entry = this.auditLog.find((e) => e.commandId === commandId);
    if (entry) {
      entry.status = status === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED';
      entry.reason = reason || (status === 'ACCEPTED' ? 'OK' : 'Rechazado por el servidor');
      this.notifyAuditLog();
    }
  }

  /**
   * Send a manual control command to Volleyball Control2 via BroadcastChannel.
   * NO direct writing to localStorage!
   */
  public sendCommand(
    action: VolleyballActionType,
    params?: { team?: 'home' | 'away'; visible?: boolean }
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // 800ms Electronic Debounce check for ADD_POINT
      if (action === 'ADD_POINT') {
        const now = Date.now();
        if (now - this.lastDebounceClickTime < 800) {
          console.warn('Command blocked by local 800ms debounce');
          resolve(false);
          return;
        }
        this.lastDebounceClickTime = now;
      }

      if (!this.commandChannel) {
        this.initChannels();
      }

      const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const timestamp = Date.now();

      const payload: VolleyballCommandPayload = {
        protocolVersion: '1.0',
        commandId,
        action,
        params,
        timestamp,
        operatorId: 'vento_v1_director'
      };

      // Add to local Audit Log
      const auditEntry: VolleyballAuditLogEntry = {
        commandId,
        timestamp,
        action,
        params,
        status: 'REQUESTED'
      };

      this.auditLog.unshift(auditEntry);
      if (this.auditLog.length > 50) this.auditLog.pop();
      this.notifyAuditLog();

      this.setPendingCommandId(commandId);

      // Timeout handler: 3000ms expiration, NO automatic retries
      const timerId = window.setTimeout(() => {
        this.pendingTimers.delete(commandId);
        if (this.currentPendingCommandId === commandId) {
          this.setPendingCommandId(null);
        }

        const entry = this.auditLog.find((e) => e.commandId === commandId);
        if (entry && entry.status === 'REQUESTED') {
          entry.status = 'EXPIRED';
          entry.reason = 'Timeout: sin respuesta de Volleyball Control2 (3s)';
          this.notifyAuditLog();
        }
        resolve(false);
      }, 3000);

      this.pendingTimers.set(commandId, timerId);

      // Post message to command channel
      try {
        if (this.commandChannel) {
          this.commandChannel.postMessage(payload);
        } else {
          console.error('Command channel uninitialized');
        }
      } catch (err) {
        console.error('Error posting command to BroadcastChannel:', err);
      }
    });
  }

  public getAuditLog(): VolleyballAuditLogEntry[] {
    return [...this.auditLog];
  }

  public clearAuditLog() {
    this.auditLog = [];
    this.notifyAuditLog();
  }
}

export const volleyballControl = new VolleyballControlService();
