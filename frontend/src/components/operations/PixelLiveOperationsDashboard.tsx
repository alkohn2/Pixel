import React from 'react';
import type { SwitcherStore } from '../../store/useSwitcherStore';
import { getDeckLinkSignalState } from '../../types/sources';
import {
  Activity,
  Radio,
  Tv,
  Cpu,
  Truck,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  AlertOctagon,
  Eye,
  Layers,
  Monitor,
  Video,
  Film
} from 'lucide-react';

interface PixelLiveOperationsDashboardProps {
  store: SwitcherStore;
  multiviewMode: 'OPERATIONS' | 'VISUAL';
  setMultiviewMode: (mode: 'OPERATIONS' | 'VISUAL') => void;
}

export const PixelLiveOperationsDashboard: React.FC<PixelLiveOperationsDashboardProps> = ({
  store,
  multiviewMode,
  setMultiviewMode
}) => {
  const {
    lastBridgeData,
    bridgeProfile,
    healthState,
    logicalSources,
    physicalInputs,
    volleyballStatus,
    programSourceId,
    previewSourceId
  } = store;

  // DeckLink channels map from Production Bridge
  const decklinkChannels = lastBridgeData?.decklink?.channels || {};
  const decklinkMapping = lastBridgeData?.decklink?.mapping || {};

  // Active PGM & PVW names and inputs
  const pgmSource = logicalSources.find(s => s.id === programSourceId);
  const pvwSource = logicalSources.find(s => s.id === previewSourceId);

  const pgmName = lastBridgeData?.program?.name || pgmSource?.name || 'RESOLUME';
  const pvwName = lastBridgeData?.preview?.name || pvwSource?.name || 'TRUCK_PGM';

  const pgmInput = lastBridgeData?.program?.input || 6;
  const pvwInput = lastBridgeData?.preview?.input || 8;

  const formattedTime = new Date().toLocaleTimeString();

  // Helper to find source by candidate names or position index
  const findSource = (names: string[], fallbackIndex: number) => {
    for (const name of names) {
      const match = logicalSources.find(
        s => s.name.toUpperCase() === name.toUpperCase() || s.shortLabel.toUpperCase() === name.toUpperCase()
      );
      if (match) return match;
    }
    return logicalSources[fallbackIndex] || null;
  };

  // OFFICIAL PIXEL VISUAL ROUTING CONVENTION:
  // TOP ROW (SDI / BNC): 1. CAM_MAIN, 2. RESOLUME, 3. OBS, 4. TRUCK_PGM
  // BOTTOM ROW (HDMI):    5. CAM_1, 6. CAM_2, 7. CAM_3, 8. COMPUTER
  const sdiSources = [
    findSource(['CAM_MAIN', 'MAIN_CAM'], 1),
    findSource(['RESOLUME', 'RES'], 6),
    findSource(['OBS'], 4),
    findSource(['TRUCK_PGM', 'TRUCK', 'TRUCK PGM'], 5)
  ];

  const hdmiSources = [
    findSource(['CAM_1', 'CAM1'], 0),
    findSource(['CAM_2', 'CAM2'], 1),
    findSource(['CAM_3', 'CAM3'], 2),
    findSource(['COMPUTER', 'COMP', 'PC'], 3)
  ];

  const truckInfo = lastBridgeData?.truck;
  const obsInfo = lastBridgeData?.obs;
  const resInfo = lastBridgeData?.resolume;
  const dlInfo = lastBridgeData?.decklink;

  // Default Resolume Layers fallback if not populated
  const resolumeLayers = resInfo?.layers && resInfo.layers.length > 0 ? resInfo.layers : [
    { id: 1, name: 'ATEM', activeClip: 'Türkiye vs. Brazil - Gold Match Highlights' },
    { id: 2, name: 'NDI 1', activeClip: 'The Wilfredo Leon Show VNL 2026' },
    { id: 3, name: 'NDI 2', activeClip: 'PERÚ DEBUTA EN EL MUNDIAL SUB 17 DE VÓLEY' },
    { id: 4, name: 'NDI 3', activeClip: 'Interview after the win against china #volleyball' },
    { id: 5, name: 'OVERLAYS', activeClip: '@mdctv01' }
  ];

  // Build 8 DeckLink channel status items
  const dlChannelList = Array.from({ length: 8 }).map((_, idx) => {
    const channelId = idx + 1;
    const inputKey = `input-${channelId}`;
    const ch = decklinkChannels[inputKey];
    const mappedSource = decklinkMapping[inputKey] || (channelId === 5 ? 'CAM_MAIN' : channelId === 2 ? 'COMPUTER' : 'Unmapped');

    let signalStateLabel = 'NO SIGNAL';
    let signalColor = '#ef4444'; // Red

    if (ch?.directionState === 'PLAYBACK') {
      signalStateLabel = ch.inputFormat ? `PLAYBACK (${ch.inputFormat})` : 'PLAYBACK (No Signal)';
      signalColor = '#38bdf8'; // Cyan
    } else if (ch?.signalLocked) {
      signalStateLabel = ch.inputFormat || '1080p59.94';
      signalColor = '#34d399'; // Green
    } else if (mappedSource === 'Unmapped') {
      signalStateLabel = 'NO SIGNAL';
      signalColor = '#ef4444';
    }

    return {
      channelId,
      inputKey,
      name: `SDI CH ${channelId} (${inputKey.toUpperCase()})`,
      mappedSource,
      signalLabel: signalStateLabel,
      signalColor,
      pixelFormat: ch?.pixelFormat || (ch?.signalLocked || ch?.directionState === 'PLAYBACK' ? '8-bit YUV 4:2:2' : 'N/A'),
      mode: ch?.directionState || (channelId === 1 || channelId === 2 ? 'PLAYBACK' : channelId === 5 ? 'CAPTURE' : 'IDLE')
    };
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px 16px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        backgroundColor: '#070a12',
        color: '#f8fafc',
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif'
      }}
    >
      {/* ======================================================== */}
      {/* ROW 1 — DEDICATED GLOBAL STATUS HEADER BAR               */}
      {/* ======================================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 18px',
          backgroundColor: '#0c101a',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          flexWrap: 'wrap',
          gap: '12px',
          boxSizing: 'border-box',
          flexShrink: 0
        }}
      >
        {/* Left: Health & Production Bridge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Health Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity style={{ width: '20px', height: '20px', color: healthState.overallStatus === 'OPTIMAL' ? '#34d399' : '#fbbf24', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: healthState.overallStatus === 'OPTIMAL' ? '#34d399' : '#fbbf24', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.5px' }}>
                HEALTH: {healthState.overallStatus}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: '"JetBrains Mono", monospace' }}>
                ({healthState.overallScore}%)
              </div>
            </div>
          </div>

          {/* Production Bridge Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Video style={{ width: '20px', height: '20px', color: lastBridgeData?.connected ? '#34d399' : '#f87171', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: lastBridgeData?.connected ? '#34d399' : '#f87171', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.5px' }}>
                PRODUCTION BRIDGE: {lastBridgeData?.connected ? 'ONLINE' : 'OFFLINE'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: '"JetBrains Mono", monospace' }}>
                Profile: {bridgeProfile || 'LAB_CURRENT (READ-ONLY)'}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Operations / Visual Mode Toggle */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#070a12',
            border: '1px solid #1e293b',
            borderRadius: '6px',
            padding: '2px',
            gap: '2px'
          }}
        >
          <button
            onClick={() => setMultiviewMode('OPERATIONS')}
            style={{
              padding: '5px 16px',
              borderRadius: '4px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 'bold',
              fontFamily: '"JetBrains Mono", monospace',
              cursor: 'pointer',
              backgroundColor: multiviewMode === 'OPERATIONS' ? '#0284c7' : 'transparent',
              color: multiviewMode === 'OPERATIONS' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.15s ease'
            }}
          >
            OPERATIONS
          </button>
          <button
            onClick={() => setMultiviewMode('VISUAL')}
            style={{
              padding: '5px 16px',
              borderRadius: '4px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 'bold',
              fontFamily: '"JetBrains Mono", monospace',
              cursor: 'pointer',
              backgroundColor: multiviewMode === 'VISUAL' ? '#0284c7' : 'transparent',
              color: multiviewMode === 'VISUAL' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.15s ease'
            }}
          >
            VISUAL
          </button>
        </div>

        {/* Right: Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '13px', fontFamily: '"JetBrains Mono", monospace' }}>
          <Clock style={{ width: '16px', height: '16px', color: '#94a3b8' }} />
          <span>{formattedTime}</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROW 2 — PREVIEW (LEFT) / PROGRAM (RIGHT) HERO CARDS      */}
      {/* ======================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flexShrink: 0 }}>
        {/* LEFT: PREVIEW CARD (GREEN #0f4d1e) */}
        <div
          style={{
            backgroundColor: '#0f4d1e',
            border: '2px solid #3fd35b',
            borderRadius: '8px',
            padding: '12px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 14px rgba(63, 211, 91, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#86efac', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace' }}>
              ● PREVIEW (EN ESPERA)
            </span>
            <span style={{ fontSize: '12px', fontFamily: '"JetBrains Mono", monospace', fontWeight: 'bold', color: '#ffffff', backgroundColor: 'rgba(0, 0, 0, 0.45)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.25)' }}>
              ATEM Input {pvwInput}
            </span>
          </div>

          <div style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', fontFamily: '"Outfit", "JetBrains Mono", sans-serif', letterSpacing: '0.8px', margin: '4px 0' }}>
            {pvwName}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#bbf7d0', fontFamily: '"JetBrains Mono", monospace' }}>
            <span>ATEM: Input {pvwInput} / BNC 3</span>
            <span style={{ color: '#34d399', fontWeight: 'bold' }}>1080p59.94 / LOCKED</span>
          </div>
        </div>

        {/* RIGHT: PROGRAM CARD (RED #5d1111) */}
        <div
          style={{
            backgroundColor: '#5d1111',
            border: '2px solid #ff3b3b',
            borderRadius: '8px',
            padding: '12px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 14px rgba(255, 59, 59, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fca5a5', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace' }}>
              ● PROGRAM (ON AIR)
            </span>
            <span style={{ fontSize: '12px', fontFamily: '"JetBrains Mono", monospace', fontWeight: 'bold', color: '#ffffff', backgroundColor: 'rgba(0, 0, 0, 0.45)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.25)' }}>
              ATEM Input {pgmInput}
            </span>
          </div>

          <div style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', fontFamily: '"Outfit", "JetBrains Mono", sans-serif', letterSpacing: '0.8px', margin: '4px 0' }}>
            {pgmName}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#fecdd3', fontFamily: '"JetBrains Mono", monospace' }}>
            <span>ATEM: Input {pgmInput} / BNC 2  <span style={{ color: '#ffffff', margin: '0 4px' }}>|</span>  Estado: <strong>TRANSMITIENDO EN VIVO</strong></span>
            <span style={{ color: '#34d399', fontWeight: 'bold' }}>1080p59.94 / LOCKED</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROW 3 — SOURCE SIGNAL GRID (TOP: SDI / BOTTOM: HDMI)     */}
      {/* ======================================================== */}
      <div style={{ backgroundColor: '#0c101a', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px 16px', boxSizing: 'border-box', flexShrink: 0 }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace', marginBottom: '10px', letterSpacing: '0.5px' }}>
          MONITOREO DE FUENTES FÍSICAS &nbsp;&nbsp;&nbsp; FILA SUPERIOR: SDI / BNC &nbsp;|&nbsp; FILA INFERIOR: HDMI
        </div>

        {/* TOP ROW (SDI / BNC) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
          {sdiSources.map((source, idx) => {
            if (!source) return <div key={`sdi-empty-${idx}`} style={{ backgroundColor: '#111622', borderRadius: '6px', border: '1px solid #1e293b' }} />;

            const physicalInput = physicalInputs.find(i => i.id === source.physicalInputId);
            const dlState = getDeckLinkSignalState(source.physicalInputId, decklinkChannels);
            const isProgram = source.name.toUpperCase() === pgmName.toUpperCase();
            const isPreview = source.name.toUpperCase() === pvwName.toUpperCase();

            return (
              <div
                key={source.id}
                style={{
                  backgroundColor: isProgram ? '#381010' : isPreview ? '#0c2e14' : '#111622',
                  border: isProgram ? '1px solid #ff3b3b' : isPreview ? '1px solid #3fd35b' : '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', fontFamily: '"JetBrains Mono", monospace' }}>
                    {source.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: '"JetBrains Mono", monospace', marginTop: '2px' }}>
                    {physicalInput?.name || 'Input BNC'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#34d399', fontFamily: '"JetBrains Mono", monospace' }}>
                    1080p59.94
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: dlState.badgeColor, fontFamily: '"JetBrains Mono", monospace', marginTop: '2px' }}>
                    {dlState.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTTOM ROW (HDMI) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {hdmiSources.map((source, idx) => {
            if (!source) return <div key={`hdmi-empty-${idx}`} style={{ backgroundColor: '#111622', borderRadius: '6px', border: '1px solid #1e293b' }} />;

            const physicalInput = physicalInputs.find(i => i.id === source.physicalInputId);
            const dlState = getDeckLinkSignalState(source.physicalInputId, decklinkChannels);
            const isProgram = source.name.toUpperCase() === pgmName.toUpperCase();
            const isPreview = source.name.toUpperCase() === pvwName.toUpperCase();

            return (
              <div
                key={source.id}
                style={{
                  backgroundColor: isProgram ? '#381010' : isPreview ? '#0c2e14' : '#111622',
                  border: isProgram ? '1px solid #ff3b3b' : isPreview ? '1px solid #3fd35b' : '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', fontFamily: '"JetBrains Mono", monospace' }}>
                    {source.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: '"JetBrains Mono", monospace', marginTop: '2px' }}>
                    {physicalInput?.name || 'Input HDMI'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#34d399', fontFamily: '"JetBrains Mono", monospace' }}>
                    1080p59.94
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: dlState.badgeColor, fontFamily: '"JetBrains Mono", monospace', marginTop: '2px' }}>
                    {dlState.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROW 4 — DECKLINK QUAD 2 (READ ONLY)                      */}
      {/* ======================================================== */}
      <div style={{ backgroundColor: '#0c101a', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px 16px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '4px', height: '14px', backgroundColor: '#fb923c', borderRadius: '2px' }} />
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fb923c', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                DECKLINK QUAD 2 (READ ONLY)
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: '"JetBrains Mono", monospace' }}>
              8 Canales SDI &nbsp;·&nbsp; 1080p59.94 &nbsp;·&nbsp; 8-bit YUV 4:2:2 &nbsp;·&nbsp; Desktop Video SDK 16.0
            </span>
          </div>
          <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: dlInfo?.connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: dlInfo?.connected ? '#34d399' : '#f87171', border: dlInfo?.connected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', fontFamily: 'monospace' }}>
            SDK ACTIVE
          </span>
        </div>

        {/* 8 Channel Cards (4 + 4 Grid) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {dlChannelList.map(ch => (
            <div
              key={ch.channelId}
              style={{
                backgroundColor: '#17120e',
                border: '1px solid #3d2617',
                borderRadius: '6px',
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#fb923c', fontFamily: '"JetBrains Mono", monospace' }}>
                {ch.name}
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                MAPPED TO: <strong style={{ color: '#ffffff' }}>{ch.mappedSource}</strong>
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                SIGNAL: <strong style={{ color: ch.signalColor }}>{ch.signalLabel}</strong>
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span>FMT: {ch.pixelFormat}</span>
                <span>MODE: {ch.mode}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROW 5 — RESOLUME ARENA (READ ONLY) - SIMPLIFIED LAYERS   */}
      {/* ======================================================== */}
      <div style={{ backgroundColor: '#0c101a', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px 16px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '4px', height: '14px', backgroundColor: '#a78bfa', borderRadius: '2px' }} />
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#a78bfa', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              RESOLUME ARENA (READ ONLY)
            </span>
          </div>
          <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: resInfo?.connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: resInfo?.connected ? '#34d399' : '#f87171', border: resInfo?.connected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', fontFamily: 'monospace' }}>
            REST API: CONNECTED
          </span>
        </div>

        {/* Resolume Active Layers / Clips */}
        <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#c084fc', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '6px' }}>
          RESOLUME LAYERS / ACTIVE CLIPS
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
          {resolumeLayers.map(layer => (
            <div
              key={layer.id}
              title={layer.activeClip ? `${layer.name}: ${layer.activeClip}` : `${layer.name}: Sin clip activo`}
              style={{
                backgroundColor: '#181324',
                border: '1px solid #36224d',
                borderRadius: '6px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                minWidth: 0,
                overflow: 'hidden'
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#c084fc', fontFamily: 'monospace' }}>
                {layer.name}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#f3e8ff',
                  fontFamily: 'monospace',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  display: 'block',
                  minWidth: 0
                }}
              >
                {layer.activeClip || 'Sin clip activo'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROW 6 — HUDL PRODUCTION TRUCK (READ ONLY)                */}
      {/* ======================================================== */}
      <div style={{ backgroundColor: '#0c101a', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px 16px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '4px', height: '14px', backgroundColor: '#fbbf24', borderRadius: '2px' }} />
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fbbf24', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              HUDL PRODUCTION TRUCK (READ ONLY)
            </span>
          </div>
          <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', fontFamily: 'monospace' }}>
            INFERRED
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          <div style={{ backgroundColor: '#1d170b', border: '1px solid #4a3410', borderRadius: '6px', padding: '8px 12px' }}>
            <div style={{ fontSize: '10px', color: '#fbbf24', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '2px' }}>PROCESS / VERSION</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fef3c7', fontFamily: 'monospace' }}>
              RUNNING v{truckInfo?.version || '4.15.0'} <span style={{ fontSize: '10px', color: '#f59e0b' }}>(DIRECT)</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#1d170b', border: '1px solid #4a3410', borderRadius: '6px', padding: '8px 12px' }}>
            <div style={{ fontSize: '10px', color: '#fbbf24', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '2px' }}>ACTIVE RENDER OUTPUT</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#34d399', fontFamily: 'monospace' }}>
              ACTIVE <span style={{ fontSize: '10px', color: '#f59e0b' }}>(INFERRED)</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#1d170b', border: '1px solid #4a3410', borderRadius: '6px', padding: '8px 12px' }}>
            <div style={{ fontSize: '10px', color: '#fbbf24', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '2px' }}>REPLAY SYSTEM</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fef3c7', fontFamily: 'monospace' }}>
              UNCONFIRMED <span style={{ fontSize: '10px', color: '#f59e0b' }}>(UNKNOWN)</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#1d170b', border: '1px solid #4a3410', borderRadius: '6px', padding: '8px 12px' }}>
            <div style={{ fontSize: '10px', color: '#fbbf24', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '2px' }}>REPLAY CAMERA / SOURCE</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fef3c7', fontFamily: 'monospace' }}>
              NONE <span style={{ fontSize: '10px', color: '#f59e0b' }}>(UNKNOWN)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROW 7 — OBS STUDIO (READ ONLY + MANUAL TRANSITION)       */}
      {/* ======================================================== */}
      <div style={{ backgroundColor: '#0c101a', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px 16px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '4px', height: '14px', backgroundColor: '#60a5fa', borderRadius: '2px' }} />
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#60a5fa', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              OBS STUDIO
            </span>
            {lastBridgeData?.manualControl?.enabled && (
              <span style={{
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: lastBridgeData.manualControl.transitionLocked ? 'rgba(56, 189, 248, 0.2)' : 'rgba(245, 158, 11, 0.15)',
                color: lastBridgeData.manualControl.transitionLocked ? '#38bdf8' : '#fbbf24',
                border: lastBridgeData.manualControl.transitionLocked ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(245, 158, 11, 0.3)'
              }}>
                {lastBridgeData.manualControl.transitionLocked ? 'TRANSITION IN PROGRESS' : `MANUAL CONTROL: ON (ATEM MACRO ${lastBridgeData.manualControl.obsTransitionMacroIndex + 1} → OBS)`}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!lastBridgeData?.manualControl?.enabled && (
              <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', border: '1px solid rgba(100, 116, 139, 0.3)', fontFamily: 'monospace' }}>
                MANUAL CONTROL: OFF
              </span>
            )}
            <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: obsInfo?.connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: obsInfo?.connected ? '#34d399' : '#f87171', border: obsInfo?.connected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', fontFamily: 'monospace' }}>
              WS CONNECTED
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
          {/* 1. PREVIEW SCENE (LEFT / GREEN ACCENT & BORDER) */}
          <div style={{
            backgroundColor: '#0c1612',
            border: '1px solid #3fd35b',
            borderRadius: '6px',
            padding: '8px 12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#86efac', fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '2px' }}>
              <span>●</span>
              <span>PREVIEW SCENE</span>
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: obsInfo?.studioMode ? '#ffffff' : '#94a3b8',
              fontFamily: 'monospace',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap'
            }}>
              {obsInfo?.studioMode ? (obsInfo?.previewScene || '---') : 'N/A — Studio Mode Off'}
            </div>
          </div>

          {/* 2. PROGRAM SCENE (RIGHT / RED ACCENT & BORDER) */}
          <div style={{
            backgroundColor: '#1a0d0d',
            border: '1px solid #ff3b3b',
            borderRadius: '6px',
            padding: '8px 12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#fca5a5', fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '2px' }}>
              <span>●</span>
              <span>PROGRAM SCENE</span>
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#ffffff',
              fontFamily: 'monospace',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap'
            }}>
              {obsInfo?.programScene || '---'}
            </div>
          </div>

          {/* 3. STUDIO MODE */}
          <div style={{ backgroundColor: '#101524', border: '1px solid #233152', borderRadius: '6px', padding: '8px 12px' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '2px' }}>STUDIO MODE</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: obsInfo?.studioMode ? '#34d399' : '#94a3b8', fontFamily: 'monospace' }}>
              {obsInfo?.studioMode ? 'ON' : 'OFF'}
            </div>
          </div>

          {/* 4. RECORDING */}
          <div style={{ backgroundColor: '#101524', border: '1px solid #233152', borderRadius: '6px', padding: '8px 12px' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '2px' }}>RECORDING</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: obsInfo?.recording ? '#f87171' : '#cbd5e1', fontFamily: 'monospace' }}>
              {obsInfo?.recording ? 'RECORDING (ON AIR)' : 'OFF'}
            </div>
          </div>

          {/* 5. STREAMING */}
          <div style={{ backgroundColor: '#101524', border: '1px solid #233152', borderRadius: '6px', padding: '8px 12px' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '2px' }}>STREAMING</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: obsInfo?.streaming ? '#38bdf8' : '#cbd5e1', fontFamily: 'monospace' }}>
              {obsInfo?.streaming ? 'STREAMING (LIVE)' : 'OFFLINE'}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROW 8 — VOLLEYBALL CONTROL2 (READ ONLY)                  */}
      {/* ======================================================== */}
      <div style={{ backgroundColor: '#0c101a', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px 16px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '4px', height: '14px', backgroundColor: '#38bdf8', borderRadius: '2px' }} />
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              VOLLEYBALL CONTROL2 (READ ONLY)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontFamily: '"JetBrains Mono", monospace', color: '#94a3b8' }}>
              <span>SET: <strong style={{ color: '#ffffff' }}>{volleyballStatus.matchState?.currentSet || '-'}</strong></span>
              <span>SCORE: <strong style={{ color: '#ffffff' }}>{volleyballStatus.matchState ? `${volleyballStatus.matchState.teamHome?.currentPoints || 0} - ${volleyballStatus.matchState.teamAway?.currentPoints || 0}` : '-'}</strong></span>
              <span>SERVING TEAM: <strong style={{ color: '#ffffff' }}>{volleyballStatus.matchState?.servingTeam || '-'}</strong></span>
            </div>

            <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: volleyballStatus.hasData ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)', color: volleyballStatus.hasData ? '#34d399' : '#94a3b8', border: volleyballStatus.hasData ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(148, 163, 184, 0.3)', fontFamily: 'monospace' }}>
              {volleyballStatus.hasData ? 'LIVE' : 'IDLE'}
            </span>
          </div>
        </div>

        <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: '"JetBrains Mono", monospace', marginTop: '4px' }}>
          Estado: {volleyballStatus.hasData ? 'LIVE MATCH' : 'IDLE'} &nbsp;·&nbsp; BroadcastChannel: mdc-volleyball-live-state active
        </div>
      </div>
    </div>
  );
};
