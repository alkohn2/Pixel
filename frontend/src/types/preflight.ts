import type { SeverityLevel, TelemetryConfidence } from './health';

export type ReadinessStatus = 'READY' | 'READY_WITH_WARNINGS' | 'NOT_READY' | 'UNKNOWN';
export type PreflightCategory = 'SYSTEM_HEALTH' | 'SIGNALS' | 'ROUTING' | 'APPLICATIONS' | 'OPERATOR_CHECKS';
export type PreflightSeverity = 'BLOCKER' | 'WARNING' | 'INFO' | 'UNKNOWN';
export type PreflightResult = 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN' | 'PENDING' | 'INFO';
export type ManualCheckStatus = 'PASS' | 'PENDING' | 'FAIL';

export interface ReadinessItem {
  id: string;
  category: PreflightCategory;
  subsystem?: 'ATEM' | 'DECKLINK' | 'OBS' | 'RESOLUME' | 'TRUCK' | 'VOLLEYBALL' | 'BRIDGE' | 'ROUTING' | 'OPERATOR' | 'PROFILE';
  result: PreflightResult;
  severity: PreflightSeverity;
  confidence: TelemetryConfidence;
  title: string;
  message: string;
  source?: string;
  actionableHint?: string;
  required: boolean;
  automatic: boolean;
  evaluatedAt: string;
}

export interface ManualCheckItem {
  id: string;
  label: string;
  description: string;
  status: ManualCheckStatus;
  required: boolean;
  category: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

export interface SubsystemReadinessSummary {
  status: ReadinessStatus;
  required: boolean;
  passCount: number;
  warnCount: number;
  failCount: number;
  unknownCount: number;
}

export interface ProductionReadinessState {
  status: ReadinessStatus;
  score: number; // 0 to 100
  blockers: ReadinessItem[];
  warnings: ReadinessItem[];
  unknown: ReadinessItem[];
  passed: ReadinessItem[];
  manualChecks: ManualCheckItem[];
  subsystemReadiness: Record<string, SubsystemReadinessSummary>;
  evaluatedAt: string;
}
