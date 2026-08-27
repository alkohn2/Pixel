import React, { useState } from 'react';
import { useSwitcherStore } from './store/useSwitcherStore';
import { ProgramPreviewMonitors } from './components/multiview/ProgramPreviewMonitors';
import { MultiviewGrid } from './components/multiview/MultiviewGrid';
import { PixelLiveOperationsDashboard } from './components/operations/PixelLiveOperationsDashboard';
import { SourceMappingTable } from './components/settings/SourceMappingTable';
import { DirectionEventsLog } from './components/events/DirectionEventsLog';
import { ReplayMarkersPanel } from './components/replay/ReplayMarkersPanel';
import { VolleyballOperationsHub } from './components/volleyball/VolleyballOperationsHub';
import { PreflightChecklistPanel } from './components/preflight/PreflightChecklistPanel';
import { EventSetupWizard } from './components/setup/EventSetupWizard';
import type { MultiviewMode } from './types/switcher';
import {
  LayoutGrid,
  Sliders,
  Radio,
  AlertTriangle,
  Clock,
  History,
  Film,
  Trophy,
  ShieldCheck,
  Sparkles,
  Activity,
  AlertOctagon,
  Monitor
} from 'lucide-react';

export function App() {
  const store = useSwitcherStore();
  const { bridgeState, bridgeProfile, lastBridgeData, healthState, eventsLog, replayMarkers, volleyballStatus, activeTab, setActiveTab } = store;

  // Multiview Sub-mode State: Default is 'OPERATIONS'
  const [multiviewMode, setMultiviewMode] = useState<MultiviewMode>('OPERATIONS');

  const formattedUpdatedAt = lastBridgeData?.updatedAt
    ? new Date(lastBridgeData.updatedAt).toLocaleTimeString()
    : null;

  const isBridgeConnected = bridgeState === 'connected';

  // Primary critical issue for top-center toast notification
  const primaryCriticalIssue = healthState.critical.length > 0 ? healthState.critical[0] : null;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        color: '#ffffff',
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        display: 'flex',
        overflow: 'hidden',
        boxSizing: 'border-box',
        userSelect: 'none'
      }}
    >
      {/* LEFT MAIN CANVAS (Fits 100vh without overflow) */}
      <div style={{ flex: 1, minWidth: 0, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

        {/* Top Center Non-Intrusive Critical Toast Banner */}
        {primaryCriticalIssue && activeTab === 'multiviewer' && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 65,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(127, 29, 29, 0.95)',
              border: '1px solid #f87171',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 'bold',
              fontFamily: '"JetBrains Mono", monospace',
              padding: '5px 16px',
              borderRadius: '6px',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.5)',
              backdropFilter: 'blur(8px)',
              pointerEvents: 'none'
            }}
          >
            <AlertOctagon style={{ width: '15px', height: '15px', color: '#ffffff', flexShrink: 0 }} />
            <span>CRITICAL: {primaryCriticalIssue.title}</span>
            {primaryCriticalIssue.actionableHint && (
              <span style={{ color: '#fca5a5', fontWeight: 'normal' }}>
                — {primaryCriticalIssue.actionableHint}
              </span>
            )}
          </div>
        )}

        {/* In VISUAL Mode only: Show top floating bar */}
        {activeTab === 'multiviewer' && multiviewMode === 'VISUAL' && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              zIndex: 60,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
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
                  padding: '4px 12px',
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
                  padding: '4px 12px',
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

            {/* Health Engine Status Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor:
                  healthState.overallStatus === 'OPTIMAL'
                    ? 'rgba(6, 78, 59, 0.95)'
                    : healthState.overallStatus === 'DEGRADED'
                    ? 'rgba(120, 53, 15, 0.95)'
                    : healthState.overallStatus === 'CRITICAL'
                    ? 'rgba(127, 29, 29, 0.95)'
                    : 'rgba(15, 23, 42, 0.95)',
                border:
                  healthState.overallStatus === 'OPTIMAL'
                    ? '1px solid rgba(52, 211, 153, 0.6)'
                    : healthState.overallStatus === 'DEGRADED'
                    ? '1px solid rgba(251, 191, 36, 0.6)'
                    : healthState.overallStatus === 'CRITICAL'
                    ? '1px solid rgba(248, 113, 113, 0.6)'
                    : '1px solid rgba(56, 189, 248, 0.6)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 'bold',
                fontFamily: '"JetBrains Mono", monospace',
                padding: '3px 9px',
                borderRadius: '5px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(8px)'
              }}
            >
              <Activity style={{ width: '12px', height: '12px', color: healthState.overallStatus === 'OPTIMAL' ? '#34d399' : healthState.overallStatus === 'DEGRADED' ? '#fbbf24' : '#f87171' }} />
              <span>HEALTH: {healthState.overallStatus}</span>
              <span style={{ color: '#94a3b8', fontSize: '10px' }}>({healthState.overallScore}%)</span>
            </div>

            {/* Production Bridge Status Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor:
                  bridgeState === 'connected'
                    ? 'rgba(6, 78, 59, 0.95)'
                    : bridgeState === 'stale'
                    ? 'rgba(120, 53, 15, 0.95)'
                    : 'rgba(127, 29, 29, 0.95)',
                border:
                  bridgeState === 'connected'
                    ? '1px solid rgba(52, 211, 153, 0.6)'
                    : bridgeState === 'stale'
                    ? '1px solid rgba(251, 191, 36, 0.6)'
                    : '1px solid rgba(248, 113, 113, 0.6)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 'bold',
                fontFamily: '"JetBrains Mono", monospace',
                padding: '3px 9px',
                borderRadius: '5px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(8px)',
                pointerEvents: 'none'
              }}
            >
              {bridgeState === 'connected' ? (
                <>
                  <Radio style={{ width: '12px', height: '12px', color: '#34d399' }} />
                  <span>BRIDGE: {bridgeProfile} (READ-ONLY)</span>
                </>
              ) : bridgeState === 'stale' ? (
                <>
                  <Clock style={{ width: '12px', height: '12px', color: '#fbbf24' }} />
                  <span>BRIDGE STALE</span>
                </>
              ) : (
                <>
                  <AlertTriangle style={{ width: '12px', height: '12px', color: '#fca5a5' }} />
                  <span>BRIDGE OFFLINE</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* PERSISTENT VOLLEYBALL OPERATIONS HUB (Mounted once, toggled via display to avoid iframe churn & duplicate controllers) */}
        <div style={{ display: activeTab === 'volleyball' ? 'flex' : 'none', width: '100%', height: '100%', overflow: 'hidden' }}>
          <VolleyballOperationsHub store={store} />
        </div>

        {/* MAIN VIEW CONTENT CANVAS */}
        {activeTab === 'volleyball' ? null : activeTab === 'multiviewer' ? (
          multiviewMode === 'OPERATIONS' ? (
            /* DEFAULT MODE: PIXEL LIVE OPERATIONS DASHBOARD (IN-FLOW HEADER & SUB-BANDS) */
            <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
              <PixelLiveOperationsDashboard
                store={store}
                multiviewMode={multiviewMode}
                setMultiviewMode={setMultiviewMode}
              />
            </div>
          ) : (
            /* OPTIONAL SECONDARY MODE: VISUAL 4x2 MULTIVIEWER */
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                padding: '2px',
                boxSizing: 'border-box'
              }}
            >
              {/* HERO PROGRAM & PREVIEW MONITORS (~58% height) */}
              <div style={{ flex: '1 1 58%', minHeight: 0, width: '100%', overflow: 'hidden' }}>
                <ProgramPreviewMonitors store={store} />
              </div>

              {/* COMPACT REFERENCE SOURCE GRID (~42% height, zero overflow) */}
              <div style={{ flex: '0 0 42%', minHeight: 0, width: '100%', overflow: 'hidden', marginTop: '2px' }}>
                <MultiviewGrid store={store} />
              </div>
            </div>
          )
        ) : activeTab === 'setup' ? (
          <div style={{ width: '100%', height: '100%', padding: '20px', backgroundColor: '#07090E', boxSizing: 'border-box', overflowY: 'auto' }}>
            <EventSetupWizard store={store} />
          </div>
        ) : activeTab === 'preflight' ? (
          <div style={{ width: '100%', height: '100%', padding: '20px', backgroundColor: '#07090E', boxSizing: 'border-box', overflowY: 'auto' }}>
            <PreflightChecklistPanel store={store} />
          </div>
        ) : activeTab === 'events' ? (
          <div style={{ width: '100%', height: '100%', padding: '20px', backgroundColor: '#07090E', boxSizing: 'border-box', overflowY: 'auto' }}>
            <DirectionEventsLog store={store} />
          </div>
        ) : activeTab === 'replay' ? (
          <div style={{ width: '100%', height: '100%', padding: '24px', backgroundColor: '#07090E', boxSizing: 'border-box', overflowY: 'auto' }}>
            <ReplayMarkersPanel store={store} />
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', padding: '20px', backgroundColor: '#07090E', boxSizing: 'border-box', overflowY: 'auto' }}>
            <SourceMappingTable store={store} />
          </div>
        )}
      </div>

      {/* RIGHT-SIDE VERTICAL OPERATIONS RAIL (EXACT 180px WIDTH) */}
      <nav
        style={{
          width: '180px',
          minWidth: '180px',
          height: '100vh',
          backgroundColor: '#070a12',
          borderLeft: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '14px 10px',
          boxSizing: 'border-box',
          zIndex: 70
        }}
      >
        <div>
          {/* Brand Header */}
          <div style={{ padding: '8px 6px 12px 6px', borderBottom: '1px solid #1e293b', marginBottom: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '1.8px', color: '#ffffff', fontFamily: '"Outfit", sans-serif' }}>
              PIXEL
            </div>
            <div style={{ fontSize: '9px', color: '#38bdf8', fontFamily: '"JetBrains Mono", monospace', marginTop: '2px', fontWeight: 'bold', letterSpacing: '0.8px' }}>
              PRO CONSOLE
            </div>
          </div>

          {/* GROUP 1: LIVE OPERATIONS */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace', paddingLeft: '4px', marginBottom: '8px', letterSpacing: '0.8px' }}>
              LIVE OPERATIONS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Multiviewer */}
              <button
                onClick={() => setActiveTab('multiviewer')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '11px 12px',
                  backgroundColor: activeTab === 'multiviewer' ? 'rgba(56, 189, 248, 0.15)' : '#0f172a',
                  border: activeTab === 'multiviewer' ? '1px solid #38bdf8' : '1px solid #1e293b',
                  borderRadius: '8px',
                  color: activeTab === 'multiviewer' ? '#38bdf8' : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <LayoutGrid style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Multiview</span>
              </button>

              {/* Preflight */}
              <button
                onClick={() => setActiveTab('preflight')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '11px 12px',
                  backgroundColor: activeTab === 'preflight' ? 'rgba(52, 211, 153, 0.15)' : '#0f172a',
                  border: activeTab === 'preflight' ? '1px solid #34d399' : '1px solid #1e293b',
                  borderRadius: '8px',
                  color: activeTab === 'preflight' ? '#34d399' : '#cbd5e1',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease'
                }}
              >
                <ShieldCheck
                  style={{
                    width: '20px',
                    height: '20px',
                    color:
                      store.readinessState.status === 'READY' ? '#34d399' :
                      store.readinessState.status === 'READY_WITH_WARNINGS' ? '#fbbf24' :
                      store.readinessState.status === 'NOT_READY' ? '#f87171' : '#38bdf8',
                    flexShrink: 0
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Preflight</span>
                <span
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor:
                      store.readinessState.status === 'READY' ? '#34d399' :
                      store.readinessState.status === 'READY_WITH_WARNINGS' ? '#fbbf24' :
                      store.readinessState.status === 'NOT_READY' ? '#f87171' : '#38bdf8'
                  }}
                  title={`Preflight Status: ${store.readinessState.status} (${store.readinessState.score}%)`}
                />
              </button>

              {/* Eventos */}
              <button
                onClick={() => setActiveTab('events')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '11px 12px',
                  backgroundColor: activeTab === 'events' ? 'rgba(167, 139, 250, 0.15)' : '#0f172a',
                  border: activeTab === 'events' ? '1px solid #a78bfa' : '1px solid #1e293b',
                  borderRadius: '8px',
                  color: activeTab === 'events' ? '#a78bfa' : '#cbd5e1',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease'
                }}
              >
                <History style={{ width: '20px', height: '20px', color: '#a78bfa', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Eventos</span>
                {eventsLog.length > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      backgroundColor: '#7c3aed',
                      color: '#ffffff',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      fontFamily: 'monospace'
                    }}
                  >
                    {eventsLog.length}
                  </span>
                )}
              </button>

              {/* Replay */}
              <button
                onClick={() => setActiveTab('replay')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '11px 12px',
                  backgroundColor: activeTab === 'replay' ? 'rgba(251, 191, 36, 0.15)' : '#0f172a',
                  border: activeTab === 'replay' ? '1px solid #fbbf24' : '1px solid #1e293b',
                  borderRadius: '8px',
                  color: activeTab === 'replay' ? '#fbbf24' : '#cbd5e1',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease'
                }}
              >
                <Film style={{ width: '20px', height: '20px', color: '#fbbf24', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Replay</span>
                {replayMarkers.length > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      backgroundColor: '#d97706',
                      color: '#ffffff',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      fontFamily: 'monospace'
                    }}
                  >
                    {replayMarkers.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: '#1e293b', margin: '8px 0 12px 0' }} />

          {/* GROUP 2: SYSTEM / SETUP */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace', paddingLeft: '4px', marginBottom: '8px', letterSpacing: '0.8px' }}>
              SYSTEM / SETUP
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Setup Rápido */}
              <button
                onClick={() => setActiveTab('setup')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '11px 12px',
                  backgroundColor: activeTab === 'setup' ? 'rgba(96, 165, 250, 0.15)' : '#0f172a',
                  border: activeTab === 'setup' ? '1px solid #60a5fa' : '1px solid #1e293b',
                  borderRadius: '8px',
                  color: activeTab === 'setup' ? '#60a5fa' : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Sparkles style={{ width: '20px', height: '20px', color: '#60a5fa', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Setup Rápido</span>
              </button>

              {/* Configuración */}
              <button
                onClick={() => setActiveTab('configuration')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '11px 12px',
                  backgroundColor: activeTab === 'configuration' ? 'rgba(52, 211, 153, 0.15)' : '#0f172a',
                  border: activeTab === 'configuration' ? '1px solid #34d399' : '1px solid #1e293b',
                  borderRadius: '8px',
                  color: activeTab === 'configuration' ? '#34d399' : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Sliders style={{ width: '20px', height: '20px', color: '#34d399', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Configuración</span>
              </button>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: '#1e293b', margin: '8px 0 12px 0' }} />

          {/* GROUP 3: SPORTS (DEDICATED FAMILY FOR SPORT MODULES) */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#38bdf8', textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace', paddingLeft: '4px', marginBottom: '8px', letterSpacing: '0.8px' }}>
              SPORTS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Volleyball */}
              <button
                onClick={() => setActiveTab('volleyball')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '11px 12px',
                  backgroundColor: activeTab === 'volleyball' ? 'rgba(56, 189, 248, 0.15)' : '#0f172a',
                  border: activeTab === 'volleyball' ? '1px solid #38bdf8' : '1px solid #1e293b',
                  borderRadius: '8px',
                  color: activeTab === 'volleyball' ? '#38bdf8' : '#cbd5e1',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease'
                }}
              >
                <Trophy style={{ width: '20px', height: '20px', color: '#38bdf8', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Volleyball</span>
                {volleyballStatus.hasData && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      fontFamily: 'monospace'
                    }}
                  >
                    LIVE
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Credit */}
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#475569', fontFamily: '"JetBrains Mono", monospace' }}>
          PIXEL v1.0
        </div>
      </nav>
    </div>
  );
}

export default App;
