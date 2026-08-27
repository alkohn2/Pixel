export interface VolleyballTeamData {
  name: string;
  color: string;
  setsWon: number;
  currentPoints: number;
  timeouts: number;
}

export interface VolleyballSetHistoryItem {
  setNumber: number;
  homePoints: number;
  awayPoints: number;
}

export interface VolleyballMatchState {
  version?: string;
  language?: string;
  matchFormat?: 'BEST_OF_5' | 'BEST_OF_3';
  autoAdvanceSet?: boolean;
  overlayVisible: boolean;
  allowVentoControl?: boolean;
  stateRevision?: number;
  teamHome: VolleyballTeamData;
  teamAway: VolleyballTeamData;
  servingTeam: 'home' | 'away' | string;
  currentSet: number;
  setsHistory?: VolleyballSetHistoryItem[];
  matchStatus: string; // e.g. "IN_PROGRESS", "FINISHED"
  timestamp: number;
}

export interface VolleyballObservabilityStatus {
  isSameOrigin: boolean;
  hasData: boolean;
  matchState: VolleyballMatchState | null;
  lastReceivedAt: number | null;
  errorMessage?: string;
}

export type VolleyballActionType = 'ADD_POINT' | 'SUB_POINT' | 'TOGGLE_SERVE' | 'TOGGLE_OVERLAY' | 'UNDO_ACTION';

export interface VolleyballCommandPayload {
  protocolVersion: '1.0';
  commandId: string;
  action: VolleyballActionType;
  params?: {
    team?: 'home' | 'away';
    visible?: boolean;
  };
  timestamp: number;
  operatorId: string;
}

export interface VolleyballCommandAck {
  protocolVersion: '1.0';
  commandId: string;
  status: 'ACCEPTED' | 'REJECTED';
  reason?: string;
  timestamp: number;
}

export interface VolleyballAuditLogEntry {
  commandId: string;
  timestamp: number;
  action: VolleyballActionType;
  params?: {
    team?: 'home' | 'away';
    visible?: boolean;
  };
  status: 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  reason?: string;
}
