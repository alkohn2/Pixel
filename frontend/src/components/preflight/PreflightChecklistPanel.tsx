import React from 'react';
import type { SwitcherStore } from '../../store/useSwitcherStore';
import type { PreflightResult, ManualCheckStatus } from '../../types/preflight';
import {
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  RotateCcw,
  Activity,
  Radio,
  Tv,
  Film,
  Cpu,
  Trophy,
  Check,
  Clock,
  UserCheck
} from 'lucide-react';

interface PreflightChecklistPanelProps {
  store: SwitcherStore;
}

export const PreflightChecklistPanel: React.FC<PreflightChecklistPanelProps> = ({ store }) => {
  const {
    readinessState,
    manualChecks,
    activeProfileId,
    profiles,
    setActiveTab,
    updateManualCheckAction,
    resetManualChecksAction
  } = store;

  const activeProfile = profiles.find(p => p.id === activeProfileId);

  const {
    status,
    score,
    blockers,
    warnings,
    unknown,
    passed,
    evaluatedAt
  } = readinessState;

  const allItems = [...blockers, ...warnings, ...unknown, ...passed];

  // Group items by category
  const systemHealthItems = allItems.filter(i => i.category === 'SYSTEM_HEALTH');
  const signalItems = allItems.filter(i => i.category === 'SIGNALS');
  const routingItems = allItems.filter(i => i.category === 'ROUTING');
  const applicationItems = allItems.filter(i => i.category === 'APPLICATIONS');

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'READY': return '#34d399';
      case 'READY_WITH_WARNINGS': return '#fbbf24';
      case 'NOT_READY': return '#f87171';
      default: return '#38bdf8';
    }
  };

  const getStatusBg = (s: string) => {
    switch (s) {
      case 'READY': return 'rgba(6, 78, 59, 0.95)';
      case 'READY_WITH_WARNINGS': return 'rgba(120, 53, 15, 0.95)';
      case 'NOT_READY': return 'rgba(127, 29, 29, 0.95)';
      default: return 'rgba(15, 23, 42, 0.95)';
    }
  };

  const getStatusBorder = (s: string) => {
    switch (s) {
      case 'READY': return '1px solid #34d399';
      case 'READY_WITH_WARNINGS': return '1px solid #fbbf24';
      case 'NOT_READY': return '1px solid #f87171';
      default: return '1px solid #38bdf8';
    }
  };

  const renderResultBadge = (result: PreflightResult) => {
    switch (result) {
      case 'PASS':
        return (
          <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', fontFamily: 'monospace' }}>
            PASS
          </span>
        );
      case 'WARN':
        return (
          <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', fontFamily: 'monospace' }}>
            WARN
          </span>
        );
      case 'FAIL':
        return (
          <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', fontFamily: 'monospace' }}>
            BLOCKED
          </span>
        );
      case 'UNKNOWN':
        return (
          <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)', fontFamily: 'monospace' }}>
            UNKNOWN
          </span>
        );
      case 'PENDING':
        return (
          <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', fontFamily: 'monospace' }}>
            PENDING
          </span>
        );
      case 'INFO':
        return (
          <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8', border: '1px solid rgba(100, 116, 139, 0.4)', fontFamily: 'monospace' }}>
            INFO
          </span>
        );
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', color: '#f8fafc', fontFamily: '"Inter", system-ui, sans-serif', paddingBottom: '30px' }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        backgroundColor: '#0c101a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => setActiveTab('multiviewer')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '6px 12px',
              color: '#cbd5e1',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft style={{ width: '14px', height: '14px' }} />
            <span>Volver a Multiview</span>
          </button>

          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '900', margin: 0, fontFamily: '"Outfit", sans-serif', letterSpacing: '0.5px' }}>
              INTELLIGENT PREFLIGHT ENGINE — CONTROL DE SALIDA EN VIVO
            </h1>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: '"JetBrains Mono", monospace', marginTop: '2px' }}>
              Perfil: <strong style={{ color: '#ffffff' }}>{activeProfile?.name || 'LAB_CURRENT'}</strong> · Evaluación: {new Date(evaluatedAt).toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Global Readiness Hero Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 18px',
          borderRadius: '8px',
          backgroundColor: getStatusBg(status),
          border: getStatusBorder(status),
          boxShadow: '0 4px 14px rgba(0,0,0,0.5)'
        }}>
          {status === 'READY' ? (
            <ShieldCheck style={{ width: '22px', height: '22px', color: '#34d399' }} />
          ) : status === 'READY_WITH_WARNINGS' ? (
            <AlertTriangle style={{ width: '22px', height: '22px', color: '#fbbf24' }} />
          ) : status === 'NOT_READY' ? (
            <AlertOctagon style={{ width: '22px', height: '22px', color: '#f87171' }} />
          ) : (
            <HelpCircle style={{ width: '22px', height: '22px', color: '#38bdf8' }} />
          )}

          <div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.8px' }}>
              {status === 'READY' ? 'READY (LISTO PARA TRANSMISIÓN)' :
               status === 'READY_WITH_WARNINGS' ? 'READY WITH WARNINGS (LISTO CON ADVERTENCIAS)' :
               status === 'NOT_READY' ? 'NOT READY (BLOQUEADO)' : 'UNKNOWN (ESTADO DESCONOCIDO)'}
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1', fontFamily: '"JetBrains Mono", monospace' }}>
              Puntuación de Preparación: <strong style={{ color: getStatusColor(status) }}>{score}%</strong> · Bloqueos: <strong style={{ color: blockers.length > 0 ? '#f87171' : '#34d399' }}>{blockers.length}</strong> · Advertencias: <strong style={{ color: warnings.length > 0 ? '#fbbf24' : '#34d399' }}>{warnings.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Blockers Banner (if any) */}
      {blockers.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(127, 29, 29, 0.95)',
          border: '1px solid #f87171',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '16px',
          boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', fontWeight: 'bold', fontSize: '14px', fontFamily: '"JetBrains Mono", monospace', marginBottom: '8px' }}>
            <AlertOctagon style={{ width: '18px', height: '18px', color: '#ffffff' }} />
            <span>ELEMENTOS BLOQUEANTES PARA SALIDA AL AIRE ({blockers.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {blockers.map(b => (
              <div key={b.id} style={{ fontSize: '12px', color: '#fca5a5', fontFamily: '"JetBrains Mono", monospace' }}>
                • <strong>{b.title}:</strong> {b.message} {b.actionableHint && <span style={{ color: '#ffffff', textDecoration: 'underline' }}>— {b.actionableHint}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Sections Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* 1. SYSTEM HEALTH */}
        <div style={{ backgroundColor: '#0c101a', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ width: '4px', height: '14px', backgroundColor: '#38bdf8', borderRadius: '2px' }} />
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#38bdf8', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' }}>
              1. SYSTEM HEALTH & CORE SERVICES ({systemHealthItems.length})
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
            {systemHealthItems.map(item => (
              <div key={item.id} style={{ backgroundColor: '#111622', border: '1px solid #1e293b', borderRadius: '6px', padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', fontFamily: 'monospace' }}>{item.title}</span>
                  {renderResultBadge(item.result)}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{item.message}</div>
                {item.actionableHint && (
                  <div style={{ fontSize: '11px', color: '#fbbf24', fontFamily: 'monospace', marginTop: '4px' }}>
                    Hint: {item.actionableHint}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 2. SIGNALS & SOURCES */}
        <div style={{ backgroundColor: '#0c101a', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ width: '4px', height: '14px', backgroundColor: '#34d399', borderRadius: '2px' }} />
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#34d399', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' }}>
              2. SIGNALS & PHYSICAL CONNECTIONS ({signalItems.length})
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
            {signalItems.map(item => (
              <div key={item.id} style={{ backgroundColor: '#111622', border: '1px solid #1e293b', borderRadius: '6px', padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', fontFamily: 'monospace' }}>{item.title}</span>
                  {renderResultBadge(item.result)}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{item.message}</div>
                {item.actionableHint && (
                  <div style={{ fontSize: '11px', color: '#fbbf24', fontFamily: 'monospace', marginTop: '4px' }}>
                    Hint: {item.actionableHint}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 3. ROUTING & CONFIGURATION */}
        <div style={{ backgroundColor: '#0c101a', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ width: '4px', height: '14px', backgroundColor: '#fb923c', borderRadius: '2px' }} />
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fb923c', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' }}>
              3. ROUTING MATRIX VALIDATION ({routingItems.length})
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
            {routingItems.map(item => (
              <div key={item.id} style={{ backgroundColor: '#111622', border: '1px solid #1e293b', borderRadius: '6px', padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', fontFamily: 'monospace' }}>{item.title}</span>
                  {renderResultBadge(item.result)}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{item.message}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. APPLICATIONS & INTEGRATIONS */}
        <div style={{ backgroundColor: '#0c101a', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ width: '4px', height: '14px', backgroundColor: '#a78bfa', borderRadius: '2px' }} />
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#a78bfa', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' }}>
              4. APPLICATIONS & PRODUCTION INTEGRATIONS ({applicationItems.length})
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
            {applicationItems.map(item => (
              <div key={item.id} style={{ backgroundColor: '#111622', border: '1px solid #1e293b', borderRadius: '6px', padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', fontFamily: 'monospace' }}>{item.title}</span>
                  {renderResultBadge(item.result)}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{item.message}</div>
                {item.confidence && (
                  <div style={{ fontSize: '10px', color: '#f59e0b', fontFamily: 'monospace', marginTop: '2px' }}>
                    Confianza: {item.confidence}
                  </div>
                )}
                {item.actionableHint && (
                  <div style={{ fontSize: '11px', color: '#fbbf24', fontFamily: 'monospace', marginTop: '4px' }}>
                    Hint: {item.actionableHint}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 5. OPERATOR MANUAL CHECKS (INTERACTIVE) */}
        <div style={{ backgroundColor: '#0c101a', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '4px', height: '14px', backgroundColor: '#f43f5e', borderRadius: '2px' }} />
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f43f5e', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' }}>
                5. OPERATOR MANUAL VERIFICATIONS ({manualChecks.length})
              </span>
            </div>

            <button
              onClick={resetManualChecksAction}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '4px',
                border: '1px solid #334155',
                backgroundColor: '#1e293b',
                color: '#cbd5e1',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              <RotateCcw style={{ width: '12px', height: '12px' }} />
              <span>Restablecer Verificaciones</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {manualChecks.map(check => (
              <div
                key={check.id}
                style={{
                  backgroundColor: '#111622',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff', fontFamily: 'monospace' }}>
                      {check.label}
                    </span>
                    <span style={{ fontSize: '10px', color: check.required ? '#f87171' : '#94a3b8', border: `1px solid ${check.required ? '#f87171' : '#334155'}`, padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace' }}>
                      {check.required ? 'REQUERIDO' : 'OPCIONAL'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace', marginTop: '2px' }}>
                    {check.description}
                  </div>
                </div>

                {/* Status Toggle Buttons */}
                <div style={{ display: 'flex', gap: '4px', backgroundColor: '#070a12', padding: '3px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <button
                    onClick={() => updateManualCheckAction(check.id, 'PASS')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '4px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      backgroundColor: check.status === 'PASS' ? '#059669' : 'transparent',
                      color: check.status === 'PASS' ? '#ffffff' : '#94a3b8'
                    }}
                  >
                    PASS
                  </button>
                  <button
                    onClick={() => updateManualCheckAction(check.id, 'PENDING')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '4px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      backgroundColor: check.status === 'PENDING' ? '#0284c7' : 'transparent',
                      color: check.status === 'PENDING' ? '#ffffff' : '#94a3b8'
                    }}
                  >
                    PENDING
                  </button>
                  <button
                    onClick={() => updateManualCheckAction(check.id, 'FAIL')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '4px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      backgroundColor: check.status === 'FAIL' ? '#dc2626' : 'transparent',
                      color: check.status === 'FAIL' ? '#ffffff' : '#94a3b8'
                    }}
                  >
                    FAIL
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
