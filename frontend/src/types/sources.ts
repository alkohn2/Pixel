import type { DeckLinkChannelStatus } from '../services/bridgeClient';

export type PhysicalInputType = 'SDI' | 'HDMI' | 'NDI' | 'MEDIA' | 'GENERATOR';

export interface PhysicalInput {
  id: string;            // e.g. 'input-2'
  name: string;          // e.g. 'Input 2'
  type: PhysicalInputType;
  resolution: string;    // e.g. '1080p60'
  status: 'active' | 'no-signal' | 'standby';
}

export type DeckLinkSignalHealthState =
  | 'signal_confirmed'           // 🟢 SEÑAL CONFIRMADA (CAPTURE + signalLocked=true + expectedFormat match)
  | 'format_mismatch_confirmed'  // 🟡 FORMATO DISTINTO (CAPTURE + signalLocked=true + format mismatch)
  | 'no_signal'                  // 🔴 SIN SEÑAL (CAPTURE + signalLocked=false)
  | 'output_active'              // 📤 SALIDA ACTIVA (PLAYBACK)
  | 'unconfirmed_signal_idle'    // ⚪ SEÑAL NO CONFIRMADA / CANAL LIBRE (IDLE + signalLocked=true)
  | 'idle_no_signal'             // ⚪ CANAL LIBRE / SIN SEÑAL CONFIRMADA (IDLE + signalLocked=false)
  | 'assigned_unknown'           // 🔵 ASIGNADA (ESTADO DESCONOCIDO)
  | 'unassigned';                 // ⚪ SIN ASIGNAR

export type ConnectorPhysicalStatus = 'Conectado' | 'Sin cable confirmado' | 'Pendiente de inspección';

export interface LogicalSource {
  id: string;               // e.g. 'pos-1'
  positionIndex: number;    // 1 to 8 fixed visual position
  name: string;             // e.g. 'CAM_1'
  shortLabel: string;       // e.g. 'CAM_1'
  physicalInputId: string;  // references PhysicalInput.id or 'unassigned'
  color: string;            // Hex color code for UI badge
  iconName: string;         // Icon representation
  status: 'assigned' | 'unassigned';
  description?: string;
}

/**
 * 4-Layer Physical Signal Matrix Mapping Interface with Physical Cabling Inspection
 * Explicit separation between Physical Connector Position (counted right to left) and Desktop Video Label.
 */
export interface PhysicalSignalMapping {
  decklinkChannelId: number;         // 1 to 8
  decklinkChannelName: string;       // e.g. "DeckLink Quad (1)"
  physicalInputId: string;           // e.g. "input-1"
  
  // EXPLICIT SEPARATION OF PHYSICAL CONNECTOR POSITION & DESKTOP VIDEO LABEL
  physicalConnectorPosition: string; // e.g. "4.º desde la derecha", "3.er desde la derecha", "Por confirmar"
  desktopVideoLabel: string;         // e.g. "SDI 3", "SDI 5", "SDI 1", "Por confirmar"
  
  // PHYSICAL DECKLINK CABLING DOCUMENTARY DATA
  connectorStatus: ConnectorPhysicalStatus;
  cableOriginDestination: string;    // Free text: e.g. "Production Truck — Program Output 1"
  
  // 4 TRACEABILITY LAYERS
  logicalSourceName: string;         // e.g. "TRUCK_PGM", "CAM_1", "RESOLUME", "OBS" or "Sin asignar"
  atemInputLabel: string;            // e.g. "ATEM BNC 4", "ATEM BNC 1 (ruta separada)"
  productionTruckSource: string;     // e.g. "Production Truck — Program Output 1"
  mappingStatus: 'PENDIENTE' | 'VERIFICADO';
  notes: string;                     // Verification note
  updatedAt?: string;
}

/**
 * Default 4-layer signal map generator for 8 DeckLink channels (LAB_CURRENT confirmed physical inspection).
 * Exactly 4 Confirmed Verified Routes:
 * - RESOLUME (Quad 1): Desktop Video SDI 1 → I/O físico 2 → ATEM BNC 2. (VERIFICADO 🟢)
 * - TRUCK_PGM (Quad 2): Desktop Video SDI 3 → 4.º desde la derecha → ATEM BNC 4. (VERIFICADO 🟢)
 * - CAM_1 (Quad 5): Desktop Video SDI 5 → 3.er desde la derecha → ATEM BNC 1 (ruta separada). (VERIFICADO 🟢)
 * - OBS (Quad 6): conector físico 5 → ATEM BNC 3 (Desktop Video por confirmar). (VERIFICADO 🟢)
 * - Channels 3, 4, 7, 8: PENDIENTE 🟡.
 */
export function getDefaultPhysicalSignalMap(): PhysicalSignalMapping[] {
  return [1, 2, 3, 4, 5, 6, 7, 8].map(chId => {
    if (chId === 1) {
      return {
        decklinkChannelId: 1,
        decklinkChannelName: 'DeckLink Quad (1)',
        physicalInputId: 'input-1',
        logicalSourceName: 'RESOLUME',
        desktopVideoLabel: 'SDI 1',
        physicalConnectorPosition: 'I/O físico 2',
        atemInputLabel: 'ATEM BNC 2',
        cableOriginDestination: 'Servidor Resolume Arena — Salida SDI',
        productionTruckSource: 'Resolume Arena',
        connectorStatus: 'Conectado',
        mappingStatus: 'VERIFICADO',
        notes: 'RESOLUME: DeckLink Quad (1) → Desktop Video SDI 1 → I/O físico 2 → ATEM BNC 2.'
      };
    }
    if (chId === 2) {
      return {
        decklinkChannelId: 2,
        decklinkChannelName: 'DeckLink Quad (2)',
        physicalInputId: 'input-2',
        logicalSourceName: 'TRUCK_PGM',
        desktopVideoLabel: 'SDI 3',
        physicalConnectorPosition: '4.º desde la derecha',
        atemInputLabel: 'ATEM BNC 4',
        cableOriginDestination: 'Production Truck — Program Output 1',
        productionTruckSource: 'Production Truck — Program Output 1',
        connectorStatus: 'Conectado',
        mappingStatus: 'VERIFICADO',
        notes: 'TRUCK_PGM: DeckLink Quad (2) → Desktop Video SDI 3 → 4.º desde la derecha → ATEM BNC 4.'
      };
    }
    if (chId === 5) {
      return {
        decklinkChannelId: 5,
        decklinkChannelName: 'DeckLink Quad (5)',
        physicalInputId: 'input-5',
        logicalSourceName: 'CAM_1',
        desktopVideoLabel: 'SDI 5',
        physicalConnectorPosition: '3.er desde la derecha',
        atemInputLabel: 'ATEM BNC 1',
        cableOriginDestination: 'Cámara 1 → DeckLink Quad (5)',
        productionTruckSource: 'Cámara 1 → DeckLink Quad (5) → Production Truck',
        connectorStatus: 'Conectado',
        mappingStatus: 'VERIFICADO',
        notes: 'CAM_1: DeckLink Quad (5) → Desktop Video SDI 5 → 3.er desde la derecha → ATEM BNC 1, ruta separada.'
      };
    }
    if (chId === 6) {
      return {
        decklinkChannelId: 6,
        decklinkChannelName: 'DeckLink Quad (6)',
        physicalInputId: 'input-6',
        logicalSourceName: 'OBS',
        desktopVideoLabel: 'Por confirmar',
        physicalConnectorPosition: 'Conector físico 5',
        atemInputLabel: 'ATEM BNC 3',
        cableOriginDestination: 'OBS Studio — Salida SDI',
        productionTruckSource: 'OBS Studio',
        connectorStatus: 'Conectado',
        mappingStatus: 'VERIFICADO',
        notes: 'OBS: DeckLink Quad (6) → conector físico 5 → ATEM BNC 3. Desktop Video por confirmar.'
      };
    }
    return {
      decklinkChannelId: chId,
      decklinkChannelName: `DeckLink Quad (${chId})`,
      physicalInputId: `input-${chId}`,
      logicalSourceName: 'Sin asignar',
      desktopVideoLabel: 'Por confirmar',
      physicalConnectorPosition: 'Por confirmar',
      atemInputLabel: 'No aplica — sin cable',
      cableOriginDestination: 'Sin cable conectado',
      productionTruckSource: 'No aplica — sin cable',
      connectorStatus: 'Sin cable confirmado',
      mappingStatus: 'PENDIENTE',
      notes: 'Inspección física pendiente.'
    };
  });
}

/**
 * Evaluates source theme colors for visual diagrams
 */
export function getSourceVisualTheme(logicalName?: string): { color: string; badgeBg: string; textHex: string } {
  const norm = (logicalName || '').toUpperCase().trim();
  if (norm.includes('CAM_1') || norm.includes('CAM1')) {
    return { color: '#10b981', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399' }; // Green
  }
  if (norm.includes('OBS')) {
    return { color: '#3b82f6', badgeBg: 'rgba(59, 130, 246, 0.2)', textHex: '#60a5fa' }; // Blue
  }
  if (norm.includes('RESOLUME')) {
    return { color: '#8b5cf6', badgeBg: 'rgba(139, 92, 246, 0.2)', textHex: '#a78bfa' }; // Purple
  }
  if (norm.includes('TRUCK')) {
    return { color: '#f59e0b', badgeBg: 'rgba(245, 158, 11, 0.2)', textHex: '#fbbf24' }; // Amber
  }
  return { color: '#06b6d4', badgeBg: 'rgba(6, 182, 212, 0.2)', textHex: '#22d3ee' }; // Cyan default
}

/**
 * Evaluates the direction state badge styling and label
 */
export function getDirectionStateBadge(directionState?: 'CAPTURE' | 'PLAYBACK' | 'IDLE'): { label: string; badgeColor: string; icon: string } {
  switch (directionState) {
    case 'CAPTURE':
      return { label: '📥 ENTRADA / CAPTURA', badgeColor: '#34d399', icon: '📥' };
    case 'PLAYBACK':
      return { label: '📤 SALIDA / PLAYBACK', badgeColor: '#fbbf24', icon: '📤' };
    case 'IDLE':
    default:
      return { label: '⚪ LIBRE', badgeColor: '#94a3b8', icon: '⚪' };
  }
}

/**
 * Evaluates precise DeckLink signal status based on strict honesty rules
 */
export function getDeckLinkSignalState(
  physicalInputId: string,
  decklinkChannels?: Record<string, DeckLinkChannelStatus>,
  expectedFormat: string = '1080p59.94'
): { state: DeckLinkSignalHealthState; label: string; badgeColor: string; details?: string } {
  if (!physicalInputId || physicalInputId === 'unassigned') {
    return { state: 'unassigned', label: 'SIN ASIGNAR', badgeColor: '#64748b' };
  }

  if (!decklinkChannels || !decklinkChannels[physicalInputId]) {
    return {
      state: 'assigned_unknown',
      label: 'ASIGNADA (ESTADO DESCONOCIDO)',
      badgeColor: '#38bdf8',
      details: 'Sin datos verificables de la tarjeta capturadora'
    };
  }

  const channel = decklinkChannels[physicalInputId];
  const dir = channel.directionState || 'IDLE';

  if (dir === 'PLAYBACK') {
    return {
      state: 'output_active',
      label: 'SALIDA ACTIVA',
      badgeColor: '#fbbf24',
      details: 'Canal reservado/operando para reproducción / salida SDI (Playback por software; sin cable físico asignado)'
    };
  }

  if (dir === 'CAPTURE') {
    if (!channel.signalLocked) {
      return {
        state: 'no_signal',
        label: 'SIN SEÑAL',
        badgeColor: '#ef4444',
        details: `Sin lock en ${channel.channelName} (${channel.physicalInputId})`
      };
    }

    const fmt = (channel.inputFormat || '').trim().toLowerCase();
    const exp = expectedFormat.trim().toLowerCase();
    const isExpected = fmt.includes('1080p59') || fmt.includes('1080p59.94') || (exp.length > 0 && fmt === exp);

    if (isExpected) {
      return {
        state: 'signal_confirmed',
        label: 'SEÑAL CONFIRMADA',
        badgeColor: '#10b981',
        details: `${channel.inputFormat} | ${channel.pixelFormat || '8-bit YUV'}`
      };
    }

    return {
      state: 'format_mismatch_confirmed',
      label: `FORMATO DISTINTO (${channel.inputFormat || 'DESCONOCIDO'})`,
      badgeColor: '#f59e0b',
      details: `Detectado ${channel.inputFormat} (Esperado ${expectedFormat})`
    };
  }

  if (channel.signalLocked) {
    return {
      state: 'unconfirmed_signal_idle',
      label: 'SEÑAL NO CONFIRMADA / CANAL LIBRE',
      badgeColor: '#94a3b8',
      details: 'Lectura latente de hardware en canal sin captura activa'
    };
  }

  return {
    state: 'idle_no_signal',
    label: 'CANAL LIBRE / SIN SEÑAL CONFIRMADA',
    badgeColor: '#64748b',
    details: 'Canal libre sin lock activo'
  };
}
