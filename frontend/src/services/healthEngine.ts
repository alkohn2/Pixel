import type { BridgeStatusResponse } from './bridgeClient';
import type { ProductionProfile } from '../types/profiles';
import type { LogicalSource } from '../types/sources';
import type {
  ProductionHealthState,
  HealthIssue,
  HealthStatus,
  SubsystemHealthScores
} from '../types/health';

/**
 * Pure evaluator for PIXEL Production Health Engine.
 * Does NOT depend on React components or hooks.
 * Does NOT perform network mutation or hardware calls.
 */
export function evaluateProductionHealth(
  data: BridgeStatusResponse | null,
  profile: ProductionProfile | null,
  logicalSources: LogicalSource[]
): ProductionHealthState {
  const nowStr = new Date().toLocaleTimeString();
  const critical: HealthIssue[] = [];
  const warnings: HealthIssue[] = [];
  const info: HealthIssue[] = [];
  const unknown: HealthIssue[] = [];

  let atemScore = 100;
  let decklinkScore = 100;
  let obsScore = 100;
  let resolumeScore = 100;
  let truckScore = 100;
  let volleyballScore = 100;

  // 1. BRIDGE & ATEM EVALUATION
  if (!data || !data.connected) {
    critical.push({
      id: `issue-bridge-off-${Date.now()}`,
      subsystem: 'ATEM',
      severity: 'CRITICAL',
      confidence: 'DIRECT',
      title: 'PRODUCTION BRIDGE OFFLINE',
      message: 'Production Bridge API (:3000) is unreachable.',
      timestamp: nowStr,
      actionableHint: 'Execute start-pixel.command in terminal or verify Node.js process.'
    });
    atemScore = 0;
  } else if (!data.atemConnected) {
    critical.push({
      id: `issue-atem-off-${Date.now()}`,
      subsystem: 'ATEM',
      severity: 'CRITICAL',
      confidence: 'DIRECT',
      title: 'ATEM SWITCHER DISCONNECTED',
      message: 'Connection to Blackmagic ATEM Television Studio Pro HD is offline.',
      timestamp: nowStr,
      actionableHint: 'Verify Ethernet cable connection to ATEM IP (192.168.0.78).'
    });
    atemScore = 20;
  } else {
    info.push({
      id: `issue-atem-ok-${Date.now()}`,
      subsystem: 'ATEM',
      severity: 'INFO',
      confidence: 'DIRECT',
      title: 'ATEM CONNECTED',
      message: `ATEM online. PGM: ${data.program?.name || 'N/A'}, PVW: ${data.preview?.name || 'N/A'}`,
      timestamp: nowStr
    });
  }

  // 2. DECKLINK & PROGRAM/PREVIEW CONTEXT EVALUATION
  if (data?.decklink) {
    if (!data.decklinkConnected) {
      warnings.push({
        id: `issue-dl-off-${Date.now()}`,
        subsystem: 'DECKLINK',
        severity: 'WARNING',
        confidence: 'DIRECT',
        title: 'DECKLINK SDK UNREACHABLE',
        message: 'DeckLink Quad 2 monitoring SDK did not return channel status.',
        timestamp: nowStr,
        actionableHint: 'Verify Blackmagic Desktop Video driver installation.'
      });
      decklinkScore = 50;
    } else {
      const pgmName = data.program?.name?.toUpperCase();
      const pvwName = data.preview?.name?.toUpperCase();
      const channels = data.decklink.channels || {};

      Object.values(channels).forEach(ch => {
        const mappedSource = data.decklink?.mapping?.[ch.physicalInputId];

        if (mappedSource) {
          const isProgram = pgmName && mappedSource.toUpperCase() === pgmName;
          const isPreview = pvwName && mappedSource.toUpperCase() === pvwName;

          if (!ch.signalLocked) {
            if (isProgram) {
              critical.push({
                id: `issue-dl-pgm-lost-${ch.channelId}`,
                subsystem: 'DECKLINK',
                severity: 'CRITICAL',
                confidence: 'DIRECT',
                title: `${mappedSource} SIGNAL LOST (ON AIR)`,
                message: `Source ${mappedSource} on Program has lost SDI signal lock on DeckLink Quad (${ch.channelId}).`,
                timestamp: nowStr,
                actionableHint: 'SOURCE IS ON AIR! Check BNC cable immediately or cut Program to a healthy backup source.',
                isProgramContext: true
              });
              decklinkScore -= 40;
            } else if (isPreview) {
              warnings.push({
                id: `issue-dl-pvw-lost-${ch.channelId}`,
                subsystem: 'DECKLINK',
                severity: 'WARNING',
                confidence: 'DIRECT',
                title: `${mappedSource} SIGNAL LOST (PREVIEW)`,
                message: `Source ${mappedSource} on Preview lacks SDI signal lock on DeckLink Quad (${ch.channelId}).`,
                timestamp: nowStr,
                actionableHint: 'Do not cut Preview to Program until SDI signal lock is re-established.',
                isPreviewContext: true
              });
              decklinkScore -= 20;
            } else {
              warnings.push({
                id: `issue-dl-idle-lost-${ch.channelId}`,
                subsystem: 'DECKLINK',
                severity: 'WARNING',
                confidence: 'DIRECT',
                title: `${mappedSource} NO SIGNAL`,
                message: `Mapped source ${mappedSource} has no SDI signal on DeckLink Quad (${ch.channelId}).`,
                timestamp: nowStr,
                actionableHint: 'Check camera power and BNC connection prior to assignment.'
              });
              decklinkScore -= 10;
            }
          }
        }
      });
    }
  }

  // 3. OBS STUDIO EVALUATION
  if (data?.obs) {
    if (!data.obsConnected) {
      warnings.push({
        id: `issue-obs-off-${Date.now()}`,
        subsystem: 'OBS',
        severity: 'WARNING',
        confidence: 'DIRECT',
        title: 'OBS CONNECTION LOST',
        message: 'OBS WebSocket server on port 4455 is not responding.',
        timestamp: nowStr,
        actionableHint: 'Verify OBS Studio is running and WebSocket Server is enabled.'
      });
      obsScore = 50;
    } else {
      info.push({
        id: `issue-obs-ok-${Date.now()}`,
        subsystem: 'OBS',
        severity: 'INFO',
        confidence: 'DIRECT',
        title: 'OBS CONNECTED',
        message: `OBS active. Scene: ${data.obs.programScene || 'Default'}`,
        timestamp: nowStr
      });
    }
  }

  // 4. RESOLUME ARENA EVALUATION
  if (data?.resolume) {
    if (!data.resolumeConnected) {
      warnings.push({
        id: `issue-res-off-${Date.now()}`,
        subsystem: 'RESOLUME',
        severity: 'WARNING',
        confidence: 'DIRECT',
        title: 'RESOLUME CONNECTION LOST',
        message: 'Resolume Arena REST API on port 8080 is unreachable.',
        timestamp: nowStr,
        actionableHint: 'Verify Resolume Arena is running and REST API is enabled in preferences.'
      });
      resolumeScore = 50;
    } else {
      info.push({
        id: `issue-res-ok-${Date.now()}`,
        subsystem: 'RESOLUME',
        severity: 'INFO',
        confidence: 'DIRECT',
        title: 'RESOLUME CONNECTED',
        message: `Resolume Arena active (${data.resolume.version || 'v7'}). Composition: ${data.resolume.compositionName || 'Sports'}`,
        timestamp: nowStr
      });
    }
  }

  // 5. HUDL PRODUCTION TRUCK EVALUATION (PRESERVING UNKNOWN SEMANTICS)
  if (data?.truck) {
    const trk = data.truck;
    if (!trk.connected || !trk.running) {
      info.push({
        id: `issue-trk-off-${Date.now()}`,
        subsystem: 'TRUCK',
        severity: 'INFO',
        confidence: trk.confidence || 'INFERRED',
        title: 'PRODUCTION TRUCK INACTIVE',
        message: 'Hudl Production Truck process is not currently active on this system.',
        timestamp: nowStr
      });
      truckScore = 80;
    } else {
      // Preserve UNKNOWN replayReady rule: MUST NEVER become a failure or critical error
      if (trk.replayReady?.value === null || trk.replayReady?.confidence === 'UNKNOWN') {
        unknown.push({
          id: `issue-trk-replay-unk-${Date.now()}`,
          subsystem: 'TRUCK',
          severity: 'UNKNOWN',
          confidence: 'UNKNOWN',
          title: 'TRUCK REPLAY STATUS UNKNOWN',
          message: 'Production Truck replay readiness state is pending log activity verification.',
          timestamp: nowStr,
          actionableHint: 'Replay availability will be confirmed upon first replay clip trigger in Production Truck.'
        });
      }

      info.push({
        id: `issue-trk-ok-${Date.now()}`,
        subsystem: 'TRUCK',
        severity: 'INFO',
        confidence: trk.confidence || 'INFERRED',
        title: 'PRODUCTION TRUCK DETECTED',
        message: `Production Truck (v${trk.version || '4.15'}) active. Render output: ${trk.outputPresent?.value ? 'YES' : 'NO'}`,
        timestamp: nowStr
      });
    }
  }

  // Clamp subsystem scores between 0 and 100
  const clamp = (val: number) => Math.max(0, Math.min(100, val));
  const subScores: SubsystemHealthScores = {
    atem: clamp(atemScore),
    decklink: clamp(decklinkScore),
    obs: clamp(obsScore),
    resolume: clamp(resolumeScore),
    truck: clamp(truckScore),
    volleyball: clamp(volleyballScore)
  };

  // Calculate Weighted Numeric Score
  const rawScore = Math.round(
    subScores.atem * 0.35 +
    subScores.decklink * 0.35 +
    subScores.obs * 0.10 +
    subScores.resolume * 0.10 +
    subScores.truck * 0.10
  );
  const overallScore = clamp(rawScore);

  // RULE: SEVERITY DOMINATES SCORE
  // A single CRITICAL condition MUST force overallStatus = CRITICAL regardless of numeric score
  let overallStatus: HealthStatus = 'OPTIMAL';

  if (critical.length > 0) {
    overallStatus = 'CRITICAL';
  } else if (warnings.length > 0) {
    overallStatus = 'DEGRADED';
  } else if (unknown.length > 0 && overallScore < 90) {
    overallStatus = 'UNKNOWN';
  } else {
    overallStatus = 'OPTIMAL';
  }

  return {
    overallScore,
    overallStatus,
    critical,
    warnings,
    info,
    unknown,
    evaluatedAt: new Date().toISOString(),
    subsystemScores: subScores
  };
}
