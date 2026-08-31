import React, { useState, useEffect } from 'react';
import type { SwitcherStore } from '../../store/useSwitcherStore';
import {
  Trophy,
  Tv,
  Users,
  FolderKanban,
  Monitor,
  Activity,
  CheckCircle2,
  Radio,
  Sparkles,
  Layers,
  Flame,
  ShieldCheck,
  Zap,
  ExternalLink,
  Columns2,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelRightClose,
  RefreshCw,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { setPixelRemoteState } from '../../services/bridgeClient';

export type VolleyballSubTab = 'live_production' | 'roster' | 'game_package' | 'output';
export type LiveSplitMode = 'split' | 'expand_match' | 'expand_graphics';

interface GraphicsPipelineStatus {
  overall: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  bridge: 'READY' | 'FAIL';
  overlayServer: 'READY' | 'FAIL';
  renderer: 'READY' | 'STARTING' | 'FAIL';
  ndiSender: 'READY' | 'FAIL';
  ndiDiscovery: 'READY' | 'FAIL';
  resolume: 'READY' | 'FAIL' | 'UNKNOWN';
  rendererPid: number | null;
}

interface VolleyballOperationsHubProps {
  store: SwitcherStore;
}

export const VolleyballOperationsHub: React.FC<VolleyballOperationsHubProps> = ({ store }) => {
  const [subTab, setSubTab] = useState<VolleyballSubTab>('live_production');
  const [splitMode, setSplitMode] = useState<LiveSplitMode>('split');
  const [pipelineStatus, setPipelineStatus] = useState<GraphicsPipelineStatus | null>(null);
  const [isRepairing, setIsRepairing] = useState<boolean>(false);
  const [repairMessage, setRepairMessage] = useState<string | null>(null);

  const fetchPipelineStatus = async () => {
    try {
      const res = await fetch('http://127.0.0.1:3000/graphics/pipeline');
      if (res.ok) {
        const data = await res.json();
        setPipelineStatus(data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchPipelineStatus();
    const interval = setInterval(fetchPipelineStatus, 3000);
    return () => clearInterval(interval);
  }, [subTab]);

  const handleRepairPipeline = async () => {
    setIsRepairing(true);
    setRepairMessage('Repairing Graphics Pipeline...');
    try {
      const res = await fetch('http://127.0.0.1:3000/graphics/repair', { method: 'POST' });
      const data = await res.json();
      if (data.pipeline) {
        setPipelineStatus(data.pipeline);
      }
      if (data.success) {
        setRepairMessage('✅ Pipeline repaired successfully — NDI source discoverable and online!');
      } else {
        setRepairMessage('⚠️ Repair completed with warnings — check logs or Resolume.');
      }
    } catch (err: any) {
      setRepairMessage(`❌ Repair request failed: ${err?.message || 'Network error'}`);
    } finally {
      setIsRepairing(false);
      setTimeout(() => setRepairMessage(null), 8000);
    }
  };

  useEffect(() => {
    // Check URL parameters for direct subtab deep-linking (e.g. ?tab=roster)
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'roster' || tabParam === 'game_package' || tabParam === 'live_production' || tabParam === 'output') {
        setSubTab(tabParam as VolleyballSubTab);
      }
    } catch (_) {}

    // Listen for tab switch requests from embedded iframes (e.g. Graphics Control, Game Package Manager)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PIXEL_NAVIGATE_TAB') {
        const targetTab = event.data.tab;
        if (targetTab === 'roster' || targetTab === 'game_package' || targetTab === 'live_production' || targetTab === 'output') {
          setSubTab(targetTab as VolleyballSubTab);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const { volleyballStatus, bridgeState } = store;
  const matchState = volleyballStatus?.matchState;

  const homeName = matchState?.teamHome?.name || 'MIAMI DADE SHARKS';
  const awayName = matchState?.teamAway?.name || 'DAYTONA STATE FALCONS';
  const homeColor = matchState?.teamHome?.color || '#0032A0';
  const awayColor = matchState?.teamAway?.color || '#b91c1c';
  const homePts = matchState?.teamHome?.currentPoints ?? 0;
  const awayPts = matchState?.teamAway?.currentPoints ?? 0;
  const homeSets = matchState?.teamHome?.setsWon ?? 0;
  const awaySets = matchState?.teamAway?.setsWon ?? 0;
  const currentSet = matchState?.currentSet ?? 1;
  const servingTeam = matchState?.servingTeam || 'home';
  const overlayVisible = matchState?.overlayVisible !== false;

  const iframeStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block',
    backgroundColor: '#07090e'
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#07090e',
        color: '#f8fafc',
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {/* ── 1. TOP QUICK STATUS HEADER (CONCISE READ-ONLY SUMMARY) ── */}
      <header
        style={{
          flex: '0 0 auto',
          padding: '8px 16px',
          backgroundColor: '#070a12',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          zIndex: 10
        }}
      >
        {/* Left: Sport Title & Live Match Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Trophy style={{ width: '15px', height: '15px', color: '#38bdf8' }} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '0.5px', color: '#ffffff', fontFamily: '"Outfit", sans-serif' }}>
                VOLLEYBALL HUB
              </div>
              <div style={{ fontSize: '9px', color: '#64748b', fontFamily: '"JetBrains Mono", monospace', fontWeight: '600' }}>
                PIXEL OPERATIONS
              </div>
            </div>
          </div>

          <div style={{ height: '24px', width: '1px', backgroundColor: '#1e293b' }} />

          {/* Match Score & Teams Strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Home Team */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: homeColor, boxShadow: `0 0 8px ${homeColor}` }} />
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#f1f5f9' }}>{homeName}</span>
              {servingTeam === 'home' && (
                <Zap style={{ width: '11px', height: '11px', color: '#fbbf24' }} title="Serving" />
              )}
            </div>

            {/* Score Capsule */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '2px 8px',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '13px',
                fontWeight: '800'
              }}
            >
              <span style={{ color: '#38bdf8' }}>{homePts}</span>
              <span style={{ color: '#475569' }}>-</span>
              <span style={{ color: '#f87171' }}>{awayPts}</span>
            </div>

            {/* Away Team */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {servingTeam === 'away' && (
                <Zap style={{ width: '11px', height: '11px', color: '#fbbf24' }} title="Serving" />
              )}
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#f1f5f9' }}>{awayName}</span>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: awayColor, boxShadow: `0 0 8px ${awayColor}` }} />
            </div>

            {/* Set & Sets Won Badges */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid #334155',
                fontSize: '11px',
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: '700',
                color: '#e2e8f0'
              }}
            >
              <span>SET {currentSet}</span>
              <span style={{ color: '#64748b' }}>|</span>
              <span style={{ color: '#94a3b8' }}>SETS: {homeSets}-{awaySets}</span>
            </div>
          </div>
        </div>

        {/* Right: Telemetry Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Graphics Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: overlayVisible ? 'rgba(6, 78, 59, 0.6)' : 'rgba(30, 41, 59, 0.6)',
              border: overlayVisible ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid #334155',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: '700',
              fontFamily: '"JetBrains Mono", monospace',
              color: overlayVisible ? '#34d399' : '#94a3b8'
            }}
          >
            <Radio style={{ width: '11px', height: '11px', color: overlayVisible ? '#34d399' : '#64748b' }} />
            <span>GRAPHICS: {overlayVisible ? 'ON AIR' : 'MUTED'}</span>
          </div>

          {/* Roster Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: 'rgba(6, 78, 59, 0.6)',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: '700',
              fontFamily: '"JetBrains Mono", monospace',
              color: '#34d399'
            }}
          >
            <ShieldCheck style={{ width: '11px', height: '11px', color: '#34d399' }} />
            <span>ROSTER: READY</span>
          </div>

          {/* Transport / NDI */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: 'rgba(14, 116, 144, 0.3)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: '700',
              fontFamily: '"JetBrains Mono", monospace',
              color: '#38bdf8'
            }}
          >
            <Activity style={{ width: '11px', height: '11px', color: '#38bdf8' }} />
            <span>NDI: PIXEL Graphics</span>
          </div>

          {/* Phase R3.1: PIXEL REMOTE Status & Quick Override */}
          {bridgeState?.manualControl && (
            <button
              onClick={() => setPixelRemoteState(bridgeState.manualControl?.enabled ? 'LOCK' : 'ARM')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: bridgeState.manualControl.enabled
                  ? 'rgba(16, 185, 129, 0.2)'
                  : bridgeState.manualControl.lockReason === 'OPERATOR'
                  ? 'rgba(245, 158, 11, 0.2)'
                  : 'rgba(239, 68, 68, 0.2)',
                border: bridgeState.manualControl.enabled
                  ? '1px solid #10b981'
                  : bridgeState.manualControl.lockReason === 'OPERATOR'
                  ? '1px solid #f59e0b'
                  : '1px solid #ef4444',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '10px',
                fontWeight: '800',
                fontFamily: '"JetBrains Mono", monospace',
                color: bridgeState.manualControl.enabled
                  ? '#34d399'
                  : bridgeState.manualControl.lockReason === 'OPERATOR'
                  ? '#fbbf24'
                  : '#f87171',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={bridgeState.manualControl.enabled ? 'Click to manually LOCK PIXEL REMOTE' : 'Click to manually ARM PIXEL REMOTE'}
            >
              {bridgeState.manualControl.enabled ? (
                <Zap style={{ width: '11px', height: '11px', color: '#34d399' }} />
              ) : (
                <Lock style={{ width: '11px', height: '11px', color: bridgeState.manualControl.lockReason === 'OPERATOR' ? '#fbbf24' : '#f87171' }} />
              )}
              <span>
                {bridgeState.manualControl.enabled
                  ? 'REMOTE: ARMED'
                  : `REMOTE: LOCKED (${bridgeState.manualControl.lockReason === 'OPERATOR' ? 'MANUAL' : bridgeState.manualControl.lockReason || 'SAFETY'})`}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* ── 2. INTERNAL SUB-NAVIGATION BAR ── */}
      <nav
        style={{
          flex: '0 0 auto',
          padding: '6px 16px',
          backgroundColor: '#0a0d17',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Sub-tab 1: LIVE PRODUCTION (COMBINED MATCH + GRAPHICS) */}
          <button
            onClick={() => setSubTab('live_production')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 16px',
              borderRadius: '6px',
              border: subTab === 'live_production' ? '1px solid #38bdf8' : '1px solid #1e293b',
              backgroundColor: subTab === 'live_production' ? 'rgba(56, 189, 248, 0.15)' : '#0f172a',
              color: subTab === 'live_production' ? '#38bdf8' : '#94a3b8',
              fontSize: '12px',
              fontWeight: '700',
              fontFamily: '"JetBrains Mono", monospace',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: subTab === 'live_production' ? '0 0 12px rgba(56, 189, 248, 0.25)' : 'none'
            }}
          >
            <Flame style={{ width: '14px', height: '14px', color: subTab === 'live_production' ? '#38bdf8' : '#64748b' }} />
            <span>LIVE PRODUCTION</span>
          </button>

          {/* Sub-tab 2: ROSTER / LINEUP */}
          <button
            onClick={() => setSubTab('roster')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 14px',
              borderRadius: '6px',
              border: subTab === 'roster' ? '1px solid #34d399' : '1px solid #1e293b',
              backgroundColor: subTab === 'roster' ? 'rgba(52, 211, 153, 0.15)' : '#0f172a',
              color: subTab === 'roster' ? '#34d399' : '#94a3b8',
              fontSize: '12px',
              fontWeight: '700',
              fontFamily: '"JetBrains Mono", monospace',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: subTab === 'roster' ? '0 0 12px rgba(52, 211, 153, 0.2)' : 'none'
            }}
          >
            <Users style={{ width: '14px', height: '14px', color: subTab === 'roster' ? '#34d399' : '#64748b' }} />
            <span>ROSTER / LINEUP</span>
          </button>

          {/* Sub-tab 3: GAME PACKAGE */}
          <button
            onClick={() => setSubTab('game_package')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 14px',
              borderRadius: '6px',
              border: subTab === 'game_package' ? '1px solid #fbbf24' : '1px solid #1e293b',
              backgroundColor: subTab === 'game_package' ? 'rgba(251, 191, 36, 0.15)' : '#0f172a',
              color: subTab === 'game_package' ? '#fbbf24' : '#94a3b8',
              fontSize: '12px',
              fontWeight: '700',
              fontFamily: '"JetBrains Mono", monospace',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: subTab === 'game_package' ? '0 0 12px rgba(251, 191, 36, 0.2)' : 'none'
            }}
          >
            <FolderKanban style={{ width: '14px', height: '14px', color: subTab === 'game_package' ? '#fbbf24' : '#64748b' }} />
            <span>GAME PACKAGE</span>
          </button>

          {/* Sub-tab 4: OUTPUT MONITOR */}
          <button
            onClick={() => setSubTab('output')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 14px',
              borderRadius: '6px',
              border: subTab === 'output' ? '1px solid #ec4899' : '1px solid #1e293b',
              backgroundColor: subTab === 'output' ? 'rgba(236, 72, 153, 0.15)' : '#0f172a',
              color: subTab === 'output' ? '#ec4899' : '#94a3b8',
              fontSize: '12px',
              fontWeight: '700',
              fontFamily: '"JetBrains Mono", monospace',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: subTab === 'output' ? '0 0 12px rgba(236, 72, 153, 0.2)' : 'none'
            }}
          >
            <Monitor style={{ width: '14px', height: '14px', color: subTab === 'output' ? '#ec4899' : '#64748b' }} />
            <span>OUTPUT</span>
          </button>
        </div>

        {/* Right Controls: Split / Expand Mode (When in LIVE PRODUCTION) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {subTab === 'live_production' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#070a12',
                border: '1px solid #1e293b',
                borderRadius: '6px',
                padding: '2px',
                gap: '2px'
              }}
            >
              {/* Split View */}
              <button
                onClick={() => setSplitMode('split')}
                title="Split View: Match Control (62%) + Graphics Control (38%)"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: '700',
                  fontFamily: '"JetBrains Mono", monospace',
                  cursor: 'pointer',
                  backgroundColor: splitMode === 'split' ? '#0284c7' : 'transparent',
                  color: splitMode === 'split' ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.15s ease'
                }}
              >
                <Columns2 style={{ width: '12px', height: '12px' }} />
                <span>SPLIT VIEW</span>
              </button>

              {/* Expand Match */}
              <button
                onClick={() => setSplitMode('expand_match')}
                title="Expand Match Control to Full Width"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: '700',
                  fontFamily: '"JetBrains Mono", monospace',
                  cursor: 'pointer',
                  backgroundColor: splitMode === 'expand_match' ? '#0284c7' : 'transparent',
                  color: splitMode === 'expand_match' ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.15s ease'
                }}
              >
                <PanelRightClose style={{ width: '12px', height: '12px' }} />
                <span>EXPAND MATCH</span>
              </button>

              {/* Expand Graphics */}
              <button
                onClick={() => setSplitMode('expand_graphics')}
                title="Expand Graphics Control to Full Width"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: '700',
                  fontFamily: '"JetBrains Mono", monospace',
                  cursor: 'pointer',
                  backgroundColor: splitMode === 'expand_graphics' ? '#0284c7' : 'transparent',
                  color: splitMode === 'expand_graphics' ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.15s ease'
                }}
              >
                <PanelLeftClose style={{ width: '12px', height: '12px' }} />
                <span>EXPAND GRAPHICS</span>
              </button>
            </div>
          )}

          {/* Direct Standalone Link (Hidden for Roster tab to maintain single authoritative Hub instance) */}
          {subTab !== 'roster' && (
            <a
              href={
                subTab === 'live_production'
                  ? '/graphics/volleyball/volleyball-control.html'
                  : subTab === 'game_package'
                  ? '/graphics/volleyball/game-package-manager.html'
                  : '/graphics/volleyball/volleyball-master-overlay.html'
              }
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: '#64748b',
                textDecoration: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #1e293b',
                backgroundColor: '#0f172a',
                fontFamily: '"JetBrains Mono", monospace'
              }}
              title="Open standalone module in new window"
            >
              <ExternalLink style={{ width: '12px', height: '12px' }} />
              <span>Window</span>
            </a>
          )}
        </div>
      </nav>

      {/* ── 3. EMBEDDED SINGLE-INSTANCE CONTENT CANVAS ── */}
      {/* 
        CRITICAL ARCHITECTURAL REQUIREMENT (Phase G6.5):
        - Live Match Control and Graphics Control exist in the DOM simultaneously in the LIVE PRODUCTION view.
        - Exactly ONE instance of volleyball-control.html and ONE instance of graphics-control.html are created.
        - Sub-tab switches and Expand modes toggle CSS layout/display, preventing any duplicate sessions or reloads.
      */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        
        {/* VIEW 1: UNIFIED LIVE PRODUCTION (MATCH CONTROL + GRAPHICS CONTROL SPLIT) */}
        <div
          style={{
            display: subTab === 'live_production' ? 'flex' : 'none',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            flexDirection: 'row',
            backgroundColor: '#05070c'
          }}
        >
          {/* LEFT COLUMN: MATCH CONTROL */}
          <div
            style={{
              display: splitMode === 'expand_graphics' ? 'none' : 'flex',
              flex: splitMode === 'expand_match' ? '1 1 100%' : '1 1 60%',
              minWidth: splitMode === 'expand_match' ? '100%' : '520px',
              height: '100%',
              flexDirection: 'column',
              borderRight: splitMode === 'split' ? '2px solid #1e293b' : 'none',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* Column Label Bar */}
            <div
              style={{
                flex: '0 0 auto',
                padding: '4px 12px',
                backgroundColor: '#0b0f19',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flame style={{ width: '13px', height: '13px', color: '#38bdf8' }} />
                <span style={{ fontSize: '11px', fontWeight: '800', fontFamily: '"JetBrains Mono", monospace', color: '#f1f5f9' }}>
                  MATCH CONTROL
                </span>
                <span style={{ fontSize: '9px', color: '#64748b', fontFamily: '"JetBrains Mono", monospace' }}>
                  (Points &bull; Serve &bull; Timeouts &bull; Sets)
                </span>
              </div>

              <div style={{ fontSize: '9px', color: '#38bdf8', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>
                SESSION ACTIVE
              </div>
            </div>

            {/* Embedded Authoritative Match Control iframe */}
            <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
              <iframe
                src="/graphics/volleyball/volleyball-control.html?v=g72b"
                title="PIXEL Volleyball Match Control"
                style={iframeStyle}
              />
            </div>
          </div>

          {/* RIGHT COLUMN: GRAPHICS CONTROL */}
          <div
            style={{
              display: splitMode === 'expand_match' ? 'none' : 'flex',
              flex: splitMode === 'expand_graphics' ? '1 1 100%' : '0 0 40%',
              minWidth: splitMode === 'expand_graphics' ? '100%' : '360px',
              height: '100%',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: '#070a12'
            }}
          >
            {/* Column Label Bar */}
            <div
              style={{
                flex: '0 0 auto',
                padding: '4px 12px',
                backgroundColor: '#0b0f19',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers style={{ width: '13px', height: '13px', color: '#a78bfa' }} />
                <span style={{ fontSize: '11px', fontWeight: '800', fontFamily: '"JetBrains Mono", monospace', color: '#f1f5f9' }}>
                  GRAPHICS CONTROL
                </span>
                <span style={{ fontSize: '9px', color: '#64748b', fontFamily: '"JetBrains Mono", monospace' }}>
                  (Scorebug &bull; Lower Third &bull; Lineup)
                </span>
              </div>

              <div style={{ fontSize: '9px', color: '#a78bfa', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>
                NDI READY
              </div>
            </div>

            {/* Embedded Authoritative Graphics Control iframe */}
            <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
              <iframe
                src="/graphics/volleyball/graphics-control.html?v=g75d"
                title="PIXEL Volleyball Graphics Controller"
                style={iframeStyle}
              />
            </div>
          </div>
        </div>

        {/* VIEW 2: ROSTER / LINEUP EDITOR */}
        <div style={{ display: subTab === 'roster' ? 'block' : 'none', width: '100%', height: '100%' }}>
          <iframe
            src="/graphics/volleyball/roster-lineup-editor.html?v=g75d"
            title="PIXEL Volleyball Roster and Lineup Editor"
            style={iframeStyle}
          />
        </div>

        {/* VIEW 3: GAME PACKAGE MANAGER */}
        <div style={{ display: subTab === 'game_package' ? 'block' : 'none', width: '100%', height: '100%' }}>
          <iframe
            src="/graphics/volleyball/game-package-manager.html?v=g75d"
            title="PIXEL Volleyball Game Package Manager"
            style={iframeStyle}
          />
        </div>

        {/* VIEW 4: OUTPUT CONFIDENCE MONITOR VIEW */}
        <div
          style={{
            display: subTab === 'output' ? 'flex' : 'none',
            width: '100%',
            height: '100%',
            flexDirection: 'column',
            backgroundColor: '#05070c',
            padding: '16px',
            boxSizing: 'border-box',
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              width: '100%',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* Monitor Header with Pipeline Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#0b0f19',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '10px 16px',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Tv style={{ width: '18px', height: '18px', color: '#ec4899' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', fontFamily: '"Outfit", sans-serif' }}>
                    MASTER OVERLAY CONFIDENCE MONITOR
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: '"JetBrains Mono", monospace' }}>
                    Native 1920x1080 @ 59.94 FPS (Live Alpha Master)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Overall Pipeline Status Pill */}
                <span
                  style={{
                    backgroundColor:
                      pipelineStatus?.overall === 'ONLINE'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : pipelineStatus?.overall === 'DEGRADED'
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${
                      pipelineStatus?.overall === 'ONLINE'
                        ? '#10b981'
                        : pipelineStatus?.overall === 'DEGRADED'
                        ? '#f59e0b'
                        : '#ef4444'
                    }`,
                    color:
                      pipelineStatus?.overall === 'ONLINE'
                        ? '#34d399'
                        : pipelineStatus?.overall === 'DEGRADED'
                        ? '#fbbf24'
                        : '#f87171',
                    fontSize: '11px',
                    fontWeight: '800',
                    fontFamily: '"JetBrains Mono", monospace',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Activity style={{ width: '12px', height: '12px' }} />
                  <span>GRAPHICS: {pipelineStatus?.overall || 'CHECKING...'}</span>
                </span>

                {/* One-Click Repair Pipeline Button */}
                <button
                  onClick={handleRepairPipeline}
                  disabled={isRepairing}
                  style={{
                    backgroundColor: isRepairing ? '#334155' : '#0284c7',
                    border: '1px solid #38bdf8',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: '800',
                    fontFamily: '"JetBrains Mono", monospace',
                    padding: '5px 12px',
                    borderRadius: '5px',
                    cursor: isRepairing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 0 12px rgba(56, 189, 248, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  title="Restart graphics renderer, verify overlay server, and validate NDI discovery"
                >
                  <Zap style={{ width: '13px', height: '13px', color: '#facc15' }} />
                  <span>{isRepairing ? 'REPAIRING PIPELINE...' : 'REPAIR GRAPHICS PIPELINE'}</span>
                </button>
              </div>
            </div>

            {/* Repair Message Banner */}
            {repairMessage && (
              <div
                style={{
                  backgroundColor: repairMessage.includes('✅')
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(245, 158, 11, 0.12)',
                  border: `1px solid ${repairMessage.includes('✅') ? '#10b981' : '#f59e0b'}`,
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: repairMessage.includes('✅') ? '#34d399' : '#fbbf24',
                  fontFamily: '"JetBrains Mono", monospace',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>{repairMessage}</span>
              </div>
            )}

            {/* 6-Part Graphics Pipeline Breakdown Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '8px',
                backgroundColor: '#07090e',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '10px 12px'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: '#64748b', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>
                  BRIDGE API
                </span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: pipelineStatus?.bridge === 'READY' ? '#34d399' : '#f87171', fontFamily: '"JetBrains Mono", monospace' }}>
                  ● {pipelineStatus?.bridge || 'READY'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: '#64748b', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>
                  OVERLAY SERVER (:8081)
                </span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: pipelineStatus?.overlayServer === 'READY' ? '#34d399' : '#f87171', fontFamily: '"JetBrains Mono", monospace' }}>
                  ● {pipelineStatus?.overlayServer || 'CHECKING'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: '#64748b', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>
                  RENDER ENGINE
                </span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: pipelineStatus?.renderer === 'READY' ? '#34d399' : pipelineStatus?.renderer === 'STARTING' ? '#fbbf24' : '#f87171', fontFamily: '"JetBrains Mono", monospace' }}>
                  ● {pipelineStatus?.renderer || 'CHECKING'} {pipelineStatus?.rendererPid ? `(${pipelineStatus.rendererPid})` : ''}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: '#64748b', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>
                  NDI SENDER
                </span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: pipelineStatus?.ndiSender === 'READY' ? '#34d399' : '#f87171', fontFamily: '"JetBrains Mono", monospace' }}>
                  ● {pipelineStatus?.ndiSender || 'CHECKING'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: '#64748b', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>
                  NDI DISCOVERY
                </span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: pipelineStatus?.ndiDiscovery === 'READY' ? '#34d399' : '#f87171', fontFamily: '"JetBrains Mono", monospace' }}>
                  ● {pipelineStatus?.ndiDiscovery || 'CHECKING'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: '#64748b', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>
                  RESOLUME LINK
                </span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: pipelineStatus?.resolume === 'READY' ? '#34d399' : '#94a3b8', fontFamily: '"JetBrains Mono", monospace' }}>
                  ● {pipelineStatus?.resolume || 'MANUAL RESTORE'}
                </span>
              </div>
            </div>

            {/* 16:9 Aspect Ratio Monitor Bezel */}
            <div
              style={{
                width: '100%',
                backgroundColor: '#000000',
                border: '2px solid #1e293b',
                borderRadius: '10px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.1)',
                overflow: 'hidden',
                position: 'relative',
                aspectRatio: '16 / 9'
              }}
            >
              {/* Checkerboard Pattern for Visual Alpha Transparency */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `
                    linear-gradient(45deg, #111827 25%, transparent 25%), 
                    linear-gradient(-45deg, #111827 25%, transparent 25%), 
                    linear-gradient(45deg, transparent 75%, #111827 75%), 
                    linear-gradient(-45deg, transparent 75%, #111827 75%)
                  `,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                  opacity: 0.3
                }}
              />

              {/* Live Master Overlay Embed */}
              <iframe
                src="/graphics/volleyball/volleyball-master-overlay.html"
                title="PIXEL Volleyball Master Overlay Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  position: 'relative',
                  zIndex: 2,
                  backgroundColor: 'transparent'
                }}
              />

              {/* Bezel Overlay Corner Indicators */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '12px',
                  zIndex: 10,
                  fontSize: '10px',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: '700',
                  color: 'rgba(255, 255, 255, 0.5)',
                  pointerEvents: 'none'
                }}
              >
                PROGRAM OUT [FILL + KEY]
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  right: '12px',
                  zIndex: 10,
                  fontSize: '10px',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: '700',
                  color: 'rgba(56, 189, 248, 0.7)',
                  pointerEvents: 'none'
                }}
              >
                NDI: PIXEL Graphics
              </div>
            </div>

            {/* Telemetry Status Strip Below Monitor */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px'
              }}
            >
              {/* Card 1: Renderer Process */}
              <div
                style={{
                  backgroundColor: '#0b0f19',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ fontSize: '10px', color: '#64748b', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>
                  RENDER ENGINE
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: pipelineStatus?.renderer === 'READY' ? '#34d399' : '#f87171' }}>
                  <CheckCircle2 style={{ width: '14px', height: '14px' }} />
                  <span>PIXEL Graphics Renderer {pipelineStatus?.rendererPid ? `(PID: ${pipelineStatus.rendererPid})` : ''}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: '"JetBrains Mono", monospace' }}>
                  Native Cocoa / WebKit (Offscreen Background)
                </div>
              </div>

              {/* Card 2: NDI Transport */}
              <div
                style={{
                  backgroundColor: '#0b0f19',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ fontSize: '10px', color: '#64748b', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>
                  TRANSPORT PROTOCOL & DISCOVERY
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: pipelineStatus?.ndiDiscovery === 'READY' ? '#38bdf8' : '#fbbf24' }}>
                  <Radio style={{ width: '14px', height: '14px' }} />
                  <span>NDI &reg; "PIXEL Graphics"</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: '"JetBrains Mono", monospace' }}>
                  {pipelineStatus?.ndiDiscovery === 'READY' ? 'DISCOVERABLE ON NDI RUNTIME ✅' : 'SEARCHING NDI RUNTIME...'}
                </div>
              </div>

              {/* Card 3: Switcher Route */}
              <div
                style={{
                  backgroundColor: '#0b0f19',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ fontSize: '10px', color: '#64748b', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>
                  RESOLUME COMPOSITING
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: pipelineStatus?.resolume === 'READY' ? '#a78bfa' : '#94a3b8' }}>
                  <Layers style={{ width: '14px', height: '14px' }} />
                  <span>Layer 5 (Overlays) &bull; Slot 1</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: '"JetBrains Mono", monospace' }}>
                  {pipelineStatus?.resolume === 'READY' ? 'Connected & Ready' : 'RESOLUME SOURCE NEEDS MANUAL RESTORE'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
