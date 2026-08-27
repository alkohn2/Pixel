export type HealthStatus = 'OPTIMAL' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';
export type SeverityLevel = 'CRITICAL' | 'WARNING' | 'INFO' | 'UNKNOWN';
export type TelemetryConfidence = 'DIRECT' | 'INFERRED' | 'UNKNOWN';

export interface HealthIssue {
  id: string;
  subsystem: 'ATEM' | 'DECKLINK' | 'OBS' | 'RESOLUME' | 'TRUCK' | 'VOLLEYBALL' | 'PROFILE';
  severity: SeverityLevel;
  confidence: TelemetryConfidence;
  title: string;
  message: string;
  timestamp: string;
  actionableHint?: string;
  isProgramContext?: boolean;
  isPreviewContext?: boolean;
}

export interface SubsystemHealthScores {
  atem: number;
  decklink: number;
  obs: number;
  resolume: number;
  truck: number;
  volleyball: number;
}

export interface ProductionHealthState {
  overallScore: number; // 0 to 100
  overallStatus: HealthStatus;
  critical: HealthIssue[];
  warnings: HealthIssue[];
  info: HealthIssue[];
  unknown: HealthIssue[];
  evaluatedAt: string;
  subsystemScores: SubsystemHealthScores;
}

/**
 * Future-compatible health event history interface (Phase 7 roadmap).
 * Storage implementation will follow in a future sub-phase.
 */
export interface HealthEventHistory {
  id: string;
  timestamp: string;
  isoTime: string;
  status: HealthStatus;
  score: number;
  issueCount: {
    critical: number;
    warnings: number;
    info: number;
    unknown: number;
  };
  primaryIssueTitle?: string;
}
