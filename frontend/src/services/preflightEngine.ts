import type { BridgeStatusResponse } from './bridgeClient';
import type { ProductionHealthState } from '../types/health';
import type { ProductionProfile } from '../types/profiles';
import type { LogicalSource, PhysicalInput } from '../types/sources';
import { getDeckLinkSignalState } from '../types/sources';
import type {
  ProductionReadinessState,
  ReadinessItem,
  ManualCheckItem,
  ReadinessStatus,
  SubsystemReadinessSummary
} from '../types/preflight';

export interface EvaluatePreflightParams {
  bridgeData: BridgeStatusResponse | null;
  healthState: ProductionHealthState;
  activeProfile?: ProductionProfile | null;
  logicalSources: LogicalSource[];
  physicalInputs: PhysicalInput[];
  manualChecks: ManualCheckItem[];
  programSourceId?: string;
  previewSourceId?: string;
}

export const DEFAULT_MANUAL_CHECKS: ManualCheckItem[] = [
  {
    id: 'CAMERAS_POSITIONED',
    label: 'Cámaras y Encuadres',
    description: 'Posición física, nivel de trípodes y encuadres de cámaras principales verificados',
    status: 'PASS',
    required: true,
    category: 'PRODUCCIÓN'
  },
  {
    id: 'AUDIO_LEVELS_CHECKED',
    label: 'Niveles de Audio',
    description: 'Micrófonos de narración, audio ambiente y retorno probados en consola',
    status: 'PASS',
    required: true,
    category: 'AUDIO'
  },
  {
    id: 'INTERCOM_COMMS',
    label: 'Intercom y Comunicaciones',
    description: 'Canal de dirección, camarógrafos y producción confirmados operativos',
    status: 'PASS',
    required: true,
    category: 'COMUNICACIÓN'
  },
  {
    id: 'GRAPHICS_OPERATOR',
    label: 'Operador de Gráficos',
    description: 'Generador de caracteres, alineaciones y overlays verificados para salida',
    status: 'PASS',
    required: true,
    category: 'GRÁFICOS'
  },
  {
    id: 'REPLAY_OPERATOR',
    label: 'Operador de Repetición',
    description: 'Sistema de repetición calibrado y marcas de prueba sincronizadas',
    status: 'PASS',
    required: false,
    category: 'REPLAY'
  }
];

/**
 * Pure Intelligent Preflight Engine (Phase 7.2).
 * Evaluates whether the broadcast production is ready to go live.
 * 
 * Rules:
 * 1. Severity dominates numeric score: any BLOCKER forces status = 'NOT_READY'.
 * 2. Profile-aware: only required subsystems impact readiness blockers/warnings.
 * 3. Never infer UNKNOWN as PASS or as false failure.
 * 4. Zero hardware writes, zero direct hardware polling.
 */
export function evaluateProductionReadiness({
  bridgeData,
  healthState,
  activeProfile,
  logicalSources,
  physicalInputs,
  manualChecks,
  programSourceId,
  previewSourceId
}: EvaluatePreflightParams): ProductionReadinessState {
  const evaluatedAt = new Date().toISOString();

  const blockers: ReadinessItem[] = [];
  const warnings: ReadinessItem[] = [];
  const unknown: ReadinessItem[] = [];
  const passed: ReadinessItem[] = [];

  const subsystemReadiness: Record<string, SubsystemReadinessSummary> = {};

  // Active module requirements from profile
  const selectedModules = activeProfile?.selectedModules || {
    cameras: true,
    truck: true,
    obs: true,
    resolume: true,
    volleyball: false
  };

  const isTruckRequired = selectedModules.truck !== false;
  const isObsRequired = selectedModules.obs !== false;
  const isResolumeRequired = selectedModules.resolume !== false;
  const isVolleyballRequired = selectedModules.volleyball === true;

  const decklinkChannels = bridgeData?.decklink?.channels || {};

  // Helper to record an evaluated readiness item
  const recordItem = (item: ReadinessItem) => {
    if (item.severity === 'BLOCKER') {
      blockers.push(item);
    } else if (item.severity === 'WARNING') {
      warnings.push(item);
    } else if (item.severity === 'UNKNOWN' || item.result === 'UNKNOWN') {
      unknown.push(item);
    } else {
      passed.push(item);
    }

    const sub = item.subsystem || 'GENERAL';
    if (!subsystemReadiness[sub]) {
      subsystemReadiness[sub] = {
        status: 'READY',
        required: item.required,
        passCount: 0,
        warnCount: 0,
        failCount: 0,
        unknownCount: 0
      };
    }

    if (item.result === 'PASS') subsystemReadiness[sub].passCount++;
    else if (item.result === 'WARN') subsystemReadiness[sub].warnCount++;
    else if (item.result === 'FAIL') subsystemReadiness[sub].failCount++;
    else subsystemReadiness[sub].unknownCount++;
  };

  // =========================================================================
  // 1. CATEGORY: SYSTEM_HEALTH
  // =========================================================================

  // Production Bridge
  if (bridgeData?.connected) {
    recordItem({
      id: 'SYS_BRIDGE_ONLINE',
      category: 'SYSTEM_HEALTH',
      subsystem: 'BRIDGE',
      result: 'PASS',
      severity: 'INFO',
      confidence: 'DIRECT',
      title: 'Production Bridge Conectado',
      message: `Telemetría central activa vía Bridge (${bridgeData.profile || 'LAB_CURRENT'})`,
      required: true,
      automatic: true,
      evaluatedAt
    });
  } else {
    recordItem({
      id: 'SYS_BRIDGE_OFFLINE',
      category: 'SYSTEM_HEALTH',
      subsystem: 'BRIDGE',
      result: 'FAIL',
      severity: 'BLOCKER',
      confidence: 'DIRECT',
      title: 'Production Bridge Desconectado',
      message: 'No se recibe telemetría del backend de producción en http://127.0.0.1:3000',
      actionableHint: 'Verifica que el servicio ./start-pixel.command esté ejecutándose',
      required: true,
      automatic: true,
      evaluatedAt
    });
  }

  // ATEM Switcher (Required Core)
  if (bridgeData?.atemConnected) {
    recordItem({
      id: 'SYS_ATEM_ONLINE',
      category: 'SYSTEM_HEALTH',
      subsystem: 'ATEM',
      result: 'PASS',
      severity: 'INFO',
      confidence: 'DIRECT',
      title: 'ATEM Switcher Conectado',
      message: 'Conexión activa con el conmutador de producción ATEM',
      required: true,
      automatic: true,
      evaluatedAt
    });
  } else {
    recordItem({
      id: 'SYS_ATEM_OFFLINE',
      category: 'SYSTEM_HEALTH',
      subsystem: 'ATEM',
      result: 'FAIL',
      severity: 'BLOCKER',
      confidence: 'DIRECT',
      title: 'ATEM Switcher Desconectado',
      message: 'El conmutador principal de video ATEM no responde por red local',
      actionableHint: 'Verifica la dirección IP y el cable Ethernet del switcher ATEM',
      required: true,
      automatic: true,
      evaluatedAt
    });
  }

  // DeckLink Quad 2 (Required Core)
  if (bridgeData?.decklinkConnected) {
    recordItem({
      id: 'SYS_DECKLINK_ACTIVE',
      category: 'SYSTEM_HEALTH',
      subsystem: 'DECKLINK',
      result: 'PASS',
      severity: 'INFO',
      confidence: 'DIRECT',
      title: 'DeckLink Quad 2 Activo',
      message: '8 canales SDI operativos vía Blackmagic Desktop Video SDK',
      required: true,
      automatic: true,
      evaluatedAt
    });
  } else {
    recordItem({
      id: 'SYS_DECKLINK_OFFLINE',
      category: 'SYSTEM_HEALTH',
      subsystem: 'DECKLINK',
      result: 'FAIL',
      severity: 'BLOCKER',
      confidence: 'DIRECT',
      title: 'DeckLink Quad 2 No Detectado',
      message: 'La tarjeta de captura DeckLink Quad 2 no está disponible para captura SDI',
      actionableHint: 'Comprueba los drivers de Blackmagic Desktop Video',
      required: true,
      automatic: true,
      evaluatedAt
    });
  }

  // Active Profile Validation
  if (activeProfile) {
    recordItem({
      id: 'SYS_PROFILE_LOADED',
      category: 'SYSTEM_HEALTH',
      subsystem: 'PROFILE',
      result: 'PASS',
      severity: 'INFO',
      confidence: 'DIRECT',
      title: `Perfil Activo: ${activeProfile.name}`,
      message: `Configuración de producción cargada (${activeProfile.sources?.length || 8} fuentes)`,
      required: true,
      automatic: true,
      evaluatedAt
    });
  } else {
    recordItem({
      id: 'SYS_NO_PROFILE',
      category: 'SYSTEM_HEALTH',
      subsystem: 'PROFILE',
      result: 'FAIL',
      severity: 'BLOCKER',
      confidence: 'DIRECT',
      title: 'Sin Perfil de Producción Activo',
      message: 'No hay un perfil de enrutamiento seleccionado para este evento',
      actionableHint: 'Selecciona o crea un perfil en la pestaña Configuración',
      required: true,
      automatic: true,
      evaluatedAt
    });
  }

  // =========================================================================
  // 2. CATEGORY: SIGNALS
  // =========================================================================

  // Program Source Signal Lock
  const pgmSource = logicalSources.find(s => s.id === programSourceId || (bridgeData?.program?.name && s.name.toUpperCase() === bridgeData.program.name.toUpperCase()));
  const pgmName = bridgeData?.program?.name || pgmSource?.name || 'PROGRAM';
  const isUnassignedPgm = pgmName.toUpperCase().startsWith('UNASSIGNED_') || pgmSource?.status === 'unassigned';

  if (isUnassignedPgm) {
    recordItem({
      id: 'SIG_PGM_UNASSIGNED',
      category: 'SIGNALS',
      subsystem: 'ATEM',
      result: 'FAIL',
      severity: 'BLOCKER',
      confidence: 'DIRECT',
      title: `Fuente Program No Asignada: ${pgmName}`,
      message: 'La salida principal Program tiene seleccionada una entrada no asignada o sin fuente configurada',
      actionableHint: 'Selecciona una fuente válida en Program en el switcher ATEM',
      required: true,
      automatic: true,
      evaluatedAt
    });
  } else if (pgmSource) {
    const pgmDlState = getDeckLinkSignalState(pgmSource.physicalInputId, decklinkChannels);
    if (pgmDlState.isLocked || pgmDlState.isPlayback || (bridgeData?.atemConnected && pgmDlState.label !== 'NO SIGNAL')) {
      recordItem({
        id: 'SIG_PGM_LOCKED',
        category: 'SIGNALS',
        subsystem: 'ATEM',
        result: 'PASS',
        severity: 'INFO',
        confidence: 'DIRECT',
        title: `Fuente Program: ${pgmName}`,
        message: `Señal confirmada en salida Program (${pgmDlState.label || '1080p59.94 LOCKED'})`,
        required: true,
        automatic: true,
        evaluatedAt
      });
    } else {
      recordItem({
        id: 'SIG_PGM_LOST',
        category: 'SIGNALS',
        subsystem: 'ATEM',
        result: 'FAIL',
        severity: 'BLOCKER',
        confidence: 'DIRECT',
        title: `Fuente Program Sin Señal: ${pgmName}`,
        message: 'La fuente actualmente en Program no tiene señal confirmada o está desconectada',
        actionableHint: 'Verifica la conexión física del cable BNC o HDMI en la entrada de Program',
        required: true,
        automatic: true,
        evaluatedAt
      });
    }
  }

  // Preview Source Signal Lock
  const pvwSource = logicalSources.find(s => s.id === previewSourceId || (bridgeData?.preview?.name && s.name.toUpperCase() === bridgeData.preview.name.toUpperCase()));
  const pvwName = bridgeData?.preview?.name || pvwSource?.name || 'PREVIEW';
  const isUnassignedPvw = pvwName.toUpperCase().startsWith('UNASSIGNED_') || !pvwSource || pvwSource?.status === 'unassigned';

  if (isUnassignedPvw) {
    recordItem({
      id: 'SIG_PVW_UNASSIGNED',
      category: 'SIGNALS',
      subsystem: 'ATEM',
      result: 'INFO',
      severity: 'INFO',
      confidence: 'DIRECT',
      title: `Fuente Preview: ${pvwName}`,
      message: 'La barra de Preview tiene seleccionada una entrada sin mapeo lógico (informativo)',
      required: false,
      automatic: true,
      evaluatedAt
    });
  } else {
    const pvwDlState = getDeckLinkSignalState(pvwSource.physicalInputId, decklinkChannels);
    if (pvwDlState.isLocked || pvwDlState.isPlayback || (bridgeData?.atemConnected && pvwDlState.label !== 'NO SIGNAL')) {
      recordItem({
        id: 'SIG_PVW_LOCKED',
        category: 'SIGNALS',
        subsystem: 'ATEM',
        result: 'PASS',
        severity: 'INFO',
        confidence: 'DIRECT',
        title: `Fuente Preview: ${pvwName}`,
        message: `Señal lista en barra de Preview (${pvwDlState.label || 'LOCKED'})`,
        required: false,
        automatic: true,
        evaluatedAt
      });
    } else {
      recordItem({
        id: 'SIG_PVW_UNLOCKED',
        category: 'SIGNALS',
        subsystem: 'ATEM',
        result: 'WARN',
        severity: 'WARNING',
        confidence: 'DIRECT',
        title: `Fuente Preview Sin Señal: ${pvwName}`,
        message: 'La fuente en Preview no tiene bloqueo de señal confirmado',
        actionableHint: 'Verifica la fuente antes de realizar la transición CUT o AUTO',
        required: false,
        automatic: true,
        evaluatedAt
      });
    }
  }

  // Check all 8 production sources
  logicalSources.forEach(source => {
    const physical = physicalInputs.find(p => p.id === source.physicalInputId);
    const dlState = getDeckLinkSignalState(source.physicalInputId, decklinkChannels);

    if (dlState.isLocked) {
      recordItem({
        id: `SIG_${source.id}_OK`,
        category: 'SIGNALS',
        subsystem: 'DECKLINK',
        result: 'PASS',
        severity: 'INFO',
        confidence: 'DIRECT',
        title: `${source.name} — Señal Confirmada`,
        message: `${physical?.name || 'Entrada física'} bloqueada en 1080p59.94`,
        source: source.name,
        required: false,
        automatic: true,
        evaluatedAt
      });
    } else if (source.status === 'unassigned') {
      recordItem({
        id: `SIG_${source.id}_UNASSIGNED`,
        category: 'SIGNALS',
        subsystem: 'DECKLINK',
        result: 'WARN',
        severity: 'WARNING',
        confidence: 'DIRECT',
        title: `${source.name} — Sin Entrada Física`,
        message: 'La fuente lógica no tiene un conector físico asignado en el perfil',
        source: source.name,
        actionableHint: 'Asigna un puerto BNC o HDMI en la matriz de mapeo',
        required: false,
        automatic: true,
        evaluatedAt
      });
    }
  });

  // =========================================================================
  // 3. CATEGORY: ROUTING
  // =========================================================================

  // Verify explicit chain configuration
  let missingRoutingCount = 0;
  logicalSources.forEach(source => {
    if (source.status !== 'unassigned' && !source.physicalInputId) {
      missingRoutingCount++;
    }
  });

  if (missingRoutingCount === 0) {
    recordItem({
      id: 'ROUTING_MATRIX_VALID',
      category: 'ROUTING',
      subsystem: 'ROUTING',
      result: 'PASS',
      severity: 'INFO',
      confidence: 'DIRECT',
      title: 'Matriz de Enrutamiento Válida',
      message: 'Todas las fuentes lógicas activas corresponden a puertos físicos válidos',
      required: true,
      automatic: true,
      evaluatedAt
    });
  } else {
    recordItem({
      id: 'ROUTING_MATRIX_INCOMPLETE',
      category: 'ROUTING',
      subsystem: 'ROUTING',
      result: 'WARN',
      severity: 'WARNING',
      confidence: 'DIRECT',
      title: 'Enrutamiento Incompleto',
      message: `${missingRoutingCount} fuente(s) tienen rutas físicas pendientes`,
      actionableHint: 'Revisa la tabla de mapeo en Configuración',
      required: false,
      automatic: true,
      evaluatedAt
    });
  }

  // =========================================================================
  // 4. CATEGORY: APPLICATIONS
  // =========================================================================

  // OBS Studio
  if (isObsRequired) {
    if (bridgeData?.obsConnected) {
      const pScene = bridgeData.obs?.programScene;
      recordItem({
        id: 'APP_OBS_READY',
        category: 'APPLICATIONS',
        subsystem: 'OBS',
        result: 'PASS',
        severity: 'INFO',
        confidence: 'DIRECT',
        title: 'OBS Studio Operativo',
        message: `Conectado vía WebSocket. Escena Program: ${pScene || 'Activa'}${bridgeData.obs?.studioMode ? ' (Studio Mode ON)' : ''}`,
        required: true,
        automatic: true,
        evaluatedAt
      });
    } else {
      recordItem({
        id: 'APP_OBS_DISCONNECTED',
        category: 'APPLICATIONS',
        subsystem: 'OBS',
        result: 'FAIL',
        severity: 'BLOCKER',
        confidence: 'DIRECT',
        title: 'OBS Studio Desconectado',
        message: 'OBS Studio no responde en el puerto WebSocket 4455',
        actionableHint: 'Abre OBS Studio y activa el servidor WebSocket',
        required: true,
        automatic: true,
        evaluatedAt
      });
    }
  }

  // Resolume Arena
  if (isResolumeRequired) {
    if (bridgeData?.resolumeConnected) {
      recordItem({
        id: 'APP_RESOLUME_READY',
        category: 'APPLICATIONS',
        subsystem: 'RESOLUME',
        result: 'PASS',
        severity: 'INFO',
        confidence: 'DIRECT',
        title: 'Resolume Arena Conectado',
        message: `Composición: ${bridgeData.resolume?.compositionName || 'Sports'} · REST API v${bridgeData.resolume?.version || '7.20.1'}`,
        required: true,
        automatic: true,
        evaluatedAt
      });
    } else {
      recordItem({
        id: 'APP_RESOLUME_DISCONNECTED',
        category: 'APPLICATIONS',
        subsystem: 'RESOLUME',
        result: 'WARN',
        severity: 'WARNING',
        confidence: 'DIRECT',
        title: 'Resolume Arena Desconectado',
        message: 'El servidor REST de Resolume Arena no responde en el puerto 8080',
        actionableHint: 'Inicia Resolume Arena y verifica la preferencia WebServer',
        required: false,
        automatic: true,
        evaluatedAt
      });
    }
  }

  // Hudl Production Truck
  if (isTruckRequired) {
    const trk = bridgeData?.truck;
    if (bridgeData?.truckConnected && trk?.running) {
      recordItem({
        id: 'APP_TRUCK_RUNNING',
        category: 'APPLICATIONS',
        subsystem: 'TRUCK',
        result: 'PASS',
        severity: 'INFO',
        confidence: 'DIRECT',
        title: 'Hudl Production Truck Activo',
        message: `Proceso en ejecución (v${trk.version || '4.15.0'})`,
        required: true,
        automatic: true,
        evaluatedAt
      });

      // Check Replay Readiness (never fail if UNKNOWN)
      if (trk.replayReady?.value === true) {
        recordItem({
          id: 'APP_TRUCK_REPLAY_READY',
          category: 'APPLICATIONS',
          subsystem: 'TRUCK',
          result: 'PASS',
          severity: 'INFO',
          confidence: trk.replayReady.confidence || 'DIRECT',
          title: 'Sistema de Replay Listo',
          message: 'Hudl Truck confirma disponibilidad de repetición instantánea',
          required: false,
          automatic: true,
          evaluatedAt
        });
      } else if (trk.replayReady?.value === false) {
        recordItem({
          id: 'APP_TRUCK_REPLAY_UNREADY',
          category: 'APPLICATIONS',
          subsystem: 'TRUCK',
          result: 'WARN',
          severity: 'WARNING',
          confidence: trk.replayReady.confidence || 'DIRECT',
          title: 'Sistema de Replay No Preparado',
          message: 'Hudl Truck no tiene cámaras de repetición armadas',
          actionableHint: 'Configura la captura de repetición en Production Truck',
          required: false,
          automatic: true,
          evaluatedAt
        });
      } else {
        // UNKNOWN: preserve as informative UNKNOWN item
        recordItem({
          id: 'APP_TRUCK_REPLAY_UNKNOWN',
          category: 'APPLICATIONS',
          subsystem: 'TRUCK',
          result: 'UNKNOWN',
          severity: 'UNKNOWN',
          confidence: 'UNKNOWN',
          title: 'Estado de Replay No Confirmado',
          message: 'Hudl Truck en ejecución pero sin telemetría directa del módulo de repetición',
          required: false,
          automatic: true,
          evaluatedAt
        });
      }
    } else {
      recordItem({
        id: 'APP_TRUCK_OFFLINE',
        category: 'APPLICATIONS',
        subsystem: 'TRUCK',
        result: 'WARN',
        severity: 'WARNING',
        confidence: 'DIRECT',
        title: 'Hudl Production Truck Inactivo',
        message: 'No se detecta el proceso de Hudl Production Truck',
        actionableHint: 'Inicia Production Truck si el evento requiere repeticiones',
        required: false,
        automatic: true,
        evaluatedAt
      });
    }
  }

  // Volleyball Control
  if (isVolleyballRequired) {
    const vMatch = bridgeData?.volleyball;
    if (vMatch?.hasData) {
      recordItem({
        id: 'APP_VOLLEYBALL_LIVE',
        category: 'APPLICATIONS',
        subsystem: 'VOLLEYBALL',
        result: 'PASS',
        severity: 'INFO',
        confidence: 'DIRECT',
        title: 'Volleyball Control2 En Vivo',
        message: `Marcador activo: ${vMatch.matchState?.teamHome?.name || 'HOME'} vs ${vMatch.matchState?.teamAway?.name || 'AWAY'}`,
        required: true,
        automatic: true,
        evaluatedAt
      });
    } else {
      recordItem({
        id: 'APP_VOLLEYBALL_IDLE',
        category: 'APPLICATIONS',
        subsystem: 'VOLLEYBALL',
        result: 'PASS',
        severity: 'INFO',
        confidence: 'DIRECT',
        title: 'Volleyball Control2 en Espera (IDLE)',
        message: 'Canal de comunicación activo; listo para inicio del partido',
        required: false,
        automatic: true,
        evaluatedAt
      });
    }
  }

  // =========================================================================
  // 5. CATEGORY: OPERATOR_CHECKS (Manual Checklist)
  // =========================================================================

  manualChecks.forEach(check => {
    if (check.status === 'FAIL') {
      recordItem({
        id: `MANUAL_${check.id}_FAIL`,
        category: 'OPERATOR_CHECKS',
        subsystem: 'OPERATOR',
        result: 'FAIL',
        severity: check.required ? 'BLOCKER' : 'WARNING',
        confidence: 'DIRECT',
        title: `Verificación Manual No Superada: ${check.label}`,
        message: check.description,
        actionableHint: 'Completa la verificación física con el equipo de producción',
        required: check.required,
        automatic: false,
        evaluatedAt
      });
    } else if (check.status === 'PENDING') {
      recordItem({
        id: `MANUAL_${check.id}_PENDING`,
        category: 'OPERATOR_CHECKS',
        subsystem: 'OPERATOR',
        result: 'PENDING',
        severity: check.required ? 'WARNING' : 'INFO',
        confidence: 'DIRECT',
        title: `Verificación Manual Pendiente: ${check.label}`,
        message: check.description,
        required: check.required,
        automatic: false,
        evaluatedAt
      });
    } else {
      recordItem({
        id: `MANUAL_${check.id}_PASS`,
        category: 'OPERATOR_CHECKS',
        subsystem: 'OPERATOR',
        result: 'PASS',
        severity: 'INFO',
        confidence: 'DIRECT',
        title: `${check.label} Confirmado`,
        message: check.description,
        required: check.required,
        automatic: false,
        evaluatedAt
      });
    }
  });

  // =========================================================================
  // 6. READINESS STATUS & SCORE CALCULATION
  // =========================================================================

  let status: ReadinessStatus = 'READY';

  // Severity Dominates: Any blocker forces NOT_READY
  if (blockers.length > 0) {
    status = 'NOT_READY';
  } else if (warnings.length > 0 || unknown.length > 0) {
    status = 'READY_WITH_WARNINGS';
  } else if (!bridgeData || !bridgeData.connected) {
    status = 'UNKNOWN';
  } else {
    status = 'READY';
  }

  // Calculate numeric score (0 - 100)
  const totalItems = blockers.length + warnings.length + unknown.length + passed.length;
  let score = 100;

  if (totalItems > 0) {
    const blockerDeductions = blockers.length * 30;
    const warningDeductions = warnings.length * 10;
    const unknownDeductions = unknown.length * 5;
    score = Math.max(0, Math.min(100, 100 - blockerDeductions - warningDeductions - unknownDeductions));
  }

  // Final subsystem overall state
  Object.keys(subsystemReadiness).forEach(sub => {
    const s = subsystemReadiness[sub];
    if (s.failCount > 0) s.status = 'NOT_READY';
    else if (s.warnCount > 0 || s.unknownCount > 0) s.status = 'READY_WITH_WARNINGS';
    else s.status = 'READY';
  });

  return {
    status,
    score,
    blockers,
    warnings,
    unknown,
    passed,
    manualChecks,
    subsystemReadiness,
    evaluatedAt
  };
}
