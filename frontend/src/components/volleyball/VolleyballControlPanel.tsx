import React, { useState, useEffect } from 'react';
import type { SwitcherStore } from '../../store/useSwitcherStore';
import { volleyballControl } from '../../services/volleyballControl';
import type { VolleyballActionType, VolleyballAuditLogEntry } from '../../types/volleyball';
import { Trophy, ShieldCheck, ShieldAlert, AlertTriangle, Plus, Minus, RotateCcw, Eye, EyeOff, Activity, Trash2, CheckCircle2, XCircle, AlertOctagon } from 'lucide-react';

interface VolleyballControlPanelProps {
  store: SwitcherStore;
}

export const VolleyballControlPanel: React.FC<VolleyballControlPanelProps> = ({ store }) => {
  const { volleyballStatus, setActiveTab } = store;
  const vState = volleyballStatus.matchState;

  // Session-only Control Enabled Toggle (Disabled by default)
  const [isSessionControlEnabled, setIsSessionControlEnabled] = useState<boolean>(false);
  const [showSessionEnableModal, setShowSessionEnableModal] = useState<boolean>(false);

  // Modal State for Confirmed Actions (SUB_POINT, TOGGLE_SERVE, TOGGLE_OVERLAY, UNDO_ACTION)
  const [pendingConfirmAction, setPendingConfirmAction] = useState<{
    action: VolleyballActionType;
    params?: { team?: 'home' | 'away'; visible?: boolean };
    title: string;
    description: string;
  } | null>(null);

  // Debounce & Pending State
  const [pendingCommandId, setPendingCommandId] = useState<string | null>(null);
  const [isDebouncingAddPoint, setIsDebouncingAddPoint] = useState<boolean>(false);
  const [auditLog, setAuditLog] = useState<VolleyballAuditLogEntry[]>([]);

  useEffect(() => {
    const unsubAudit = volleyballControl.subscribeAuditLog((log) => setAuditLog(log));
    const unsubPending = volleyballControl.subscribePendingState((id) => setPendingCommandId(id));
    return () => {
      unsubAudit();
      unsubPending();
    };
  }, []);

  const isSameOrigin = volleyballStatus.isSameOrigin;
  const isAuthorizedByHost = Boolean(vState?.allowVentoControl);
  const canSendCommands = isSameOrigin && isSessionControlEnabled && isAuthorizedByHost;

  const hName = vState?.teamHome?.name || 'HOME TEAM';
  const aName = vState?.teamAway?.name || 'AWAY TEAM';
  const hPts = vState?.teamHome?.currentPoints ?? 0;
  const aPts = vState?.teamAway?.currentPoints ?? 0;
  const serveTeam = vState?.servingTeam || 'home';
  const overlayVis = vState?.overlayVisible !== false;

  const handleToggleSessionControl = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setShowSessionEnableModal(true);
    } else {
      setIsSessionControlEnabled(false);
    }
  };

  const confirmEnableSession = () => {
    setIsSessionControlEnabled(true);
    setShowSessionEnableModal(false);
  };

  // ADD_POINT Handler: Large Button, 800ms Debounce, NO Modal per point
  const handleAddPoint = (team: 'home' | 'away') => {
    if (!canSendCommands || isDebouncingAddPoint || pendingCommandId) return;

    setIsDebouncingAddPoint(true);
    volleyballControl.sendCommand('ADD_POINT', { team });

    setTimeout(() => {
      setIsDebouncingAddPoint(false);
    }, 800);
  };

  // Generic Request Handler (Opens Confirmation Modal for high-impact actions)
  const requestConfirmedAction = (
    action: VolleyballActionType,
    params: { team?: 'home' | 'away'; visible?: boolean } | undefined,
    title: string,
    description: string
  ) => {
    if (!canSendCommands) return;
    setPendingConfirmAction({ action, params, title, description });
  };

  const executeConfirmedAction = () => {
    if (!pendingConfirmAction) return;
    const { action, params } = pendingConfirmAction;
    setPendingConfirmAction(null);
    volleyballControl.sendCommand(action, params);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px',
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy style={{ width: '20px', height: '20px', color: '#ffffff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, fontFamily: '"Outfit", sans-serif' }}>
                PANEL DE CONTROL MANUAL SEGURO — VOLLEYBALL CONTROL2
              </h1>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                fontSize: '11px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                <ShieldCheck style={{ width: '11px', height: '11px' }} />
                PROTOCOL V1.0 (REQUEST/ACK)
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Envío de comandos síncronos validados por la consola principal de Volleyball Control2
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('multiviewer')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            backgroundColor: '#1e293b',
            color: '#cbd5e1',
            fontSize: '13px',
            fontWeight: 'bold',
            borderRadius: '6px',
            border: '1px solid #334155',
            cursor: 'pointer'
          }}
        >
          VER MULTIVIEWER
        </button>
      </div>

      {/* Security & Authorization Status Panel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {/* Host Authorization Status Pill */}
        <div style={{
          backgroundColor: '#0f172a',
          border: isAuthorizedByHost ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(248, 113, 113, 0.4)',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '6px' }}>
              ESTADO DE AUTORIZACIÓN EN SERVIDOR (VOLLEYBALL CONTROL2)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace' }}>
              {isAuthorizedByHost ? (
                <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 style={{ width: '16px', height: '16px' }} />
                  🟢 CONTROL AUTORIZADO POR VOLLEYBALL CONTROL2
                </span>
              ) : (
                <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <XCircle style={{ width: '16px', height: '16px' }} />
                  🔴 CONTROL NO AUTORIZADO (Activa "ALLOW VENTO CONTROL" en el marcador)
                </span>
              )}
            </div>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0', fontFamily: 'monospace' }}>
            {isAuthorizedByHost
              ? 'La consola de Volleyball Control2 tiene activada la casilla "ALLOW VENTO CONTROL".'
              : 'Para enviar puntos o acciones, activa primero la casilla "ALLOW VENTO CONTROL" en la barra superior de volleyball-control.html.'}
          </p>
        </div>

        {/* Local Session Toggle Box */}
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '6px' }}>
              MODO DE CONTROL EN VENTO (SESIÓN ACTUAL)
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isSessionControlEnabled}
                onChange={handleToggleSessionControl}
                disabled={!isAuthorizedByHost || !isSameOrigin}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0284c7' }}
              />
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: isSessionControlEnabled ? '#38bdf8' : '#94a3b8', fontFamily: 'monospace' }}>
                {isSessionControlEnabled ? '🔵 HABILITADO EN ESTA SESIÓN' : '⚪ DESACTIVADO (SOLO LECTURA)'}
              </span>
            </label>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0', fontFamily: 'monospace' }}>
            Desactivado por defecto al iniciar Vento. Se restablece a solo lectura al cerrar la pestaña.
          </p>
        </div>
      </div>

      {/* Main Scoreboard Action Engine */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        opacity: canSendCommands ? 1 : 0.6,
        pointerEvents: canSendCommands ? 'auto' : 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, color: '#f8fafc', fontFamily: 'monospace' }}>
            MOTOR DE ACCIONES DE MARCADOR EN VIVO
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Quick Actions (Undo & Overlay) */}
            <button
              onClick={() => requestConfirmedAction('UNDO_ACTION', undefined, 'DESHACER ÚLTIMA ACCIÓN', '¿Deseas solicitar a Volleyball Control2 deshacer la última jugada registrada?')}
              disabled={!canSendCommands || Boolean(pendingCommandId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              <RotateCcw style={{ width: '14px', height: '14px' }} />
              DESHACER (UNDO)
            </button>

            <button
              onClick={() => requestConfirmedAction('TOGGLE_OVERLAY', { visible: !overlayVis }, overlayVis ? 'OCULTAR OVERLAY' : 'MOSTRAR OVERLAY', `¿Deseas ${overlayVis ? 'ocultar' : 'mostrar'} la sobreimpresión del marcador en OBS?`)}
              disabled={!canSendCommands || Boolean(pendingCommandId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: overlayVis ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: overlayVis ? '#f87171' : '#34d399',
                border: overlayVis ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {overlayVis ? <EyeOff style={{ width: '14px', height: '14px' }} /> : <Eye style={{ width: '14px', height: '14px' }} />}
              {overlayVis ? 'OCULTAR OVERLAY' : 'MOSTRAR OVERLAY'}
            </button>
          </div>
        </div>

        {/* 2-Column Teams Action Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* HOME TEAM CARD */}
          <div style={{ backgroundColor: '#070a12', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '14px', height: '14px', borderRadius: '3px', backgroundColor: vState?.teamHome?.color || '#0032A0', display: 'inline-block' }} />
                <span style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff', fontFamily: 'monospace' }}>{hName}</span>
              </div>

              <button
                onClick={() => requestConfirmedAction('TOGGLE_SERVE', { team: 'home' }, 'CAMBIAR SAQUE A LOCAL', `¿Deseas asignar la posesión del saque activo a ${hName}?`)}
                style={{
                  padding: '4px 10px',
                  backgroundColor: serveTeam === 'home' ? 'rgba(217, 119, 6, 0.3)' : '#1e293b',
                  color: serveTeam === 'home' ? '#fbbf24' : '#94a3b8',
                  border: serveTeam === 'home' ? '1px solid #d97706' : '1px solid #334155',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ● SAQUE {serveTeam === 'home' ? '(ACTIVO)' : ''}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', margin: '10px 0' }}>
              <div style={{ fontSize: '56px', fontWeight: '900', color: '#ffffff', fontFamily: 'monospace', lineHeight: 1 }}>
                {hPts}
              </div>

              {/* Large +1 Point Button (No Modal, 800ms Debounce) */}
              <button
                onClick={() => handleAddPoint('home')}
                disabled={isDebouncingAddPoint || Boolean(pendingCommandId)}
                style={{
                  width: '100%',
                  height: '70px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: '900',
                  letterSpacing: '1px',
                  cursor: isDebouncingAddPoint ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isDebouncingAddPoint ? 0.6 : 1
                }}
              >
                <Plus style={{ width: '22px', height: '22px' }} />
                +1 PUNTO ({hName})
              </button>

              <button
                onClick={() => requestConfirmedAction('SUB_POINT', { team: 'home' }, 'CORREGIR -1 PUNTO (LOCAL)', `¿Deseas restar 1 punto al equipo ${hName}?`)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Minus style={{ width: '12px', height: '12px' }} />
                -1 Punto Corrección
              </button>
            </div>
          </div>

          {/* AWAY TEAM CARD */}
          <div style={{ backgroundColor: '#070a12', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '14px', height: '14px', borderRadius: '3px', backgroundColor: vState?.teamAway?.color || '#b91c1c', display: 'inline-block' }} />
                <span style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff', fontFamily: 'monospace' }}>{aName}</span>
              </div>

              <button
                onClick={() => requestConfirmedAction('TOGGLE_SERVE', { team: 'away' }, 'CAMBIAR SAQUE A VISITANTE', `¿Deseas asignar la posesión del saque activo a ${aName}?`)}
                style={{
                  padding: '4px 10px',
                  backgroundColor: serveTeam === 'away' ? 'rgba(217, 119, 6, 0.3)' : '#1e293b',
                  color: serveTeam === 'away' ? '#fbbf24' : '#94a3b8',
                  border: serveTeam === 'away' ? '1px solid #d97706' : '1px solid #334155',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ● SAQUE {serveTeam === 'away' ? '(ACTIVO)' : ''}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', margin: '10px 0' }}>
              <div style={{ fontSize: '56px', fontWeight: '900', color: '#ffffff', fontFamily: 'monospace', lineHeight: 1 }}>
                {aPts}
              </div>

              {/* Large +1 Point Button (No Modal, 800ms Debounce) */}
              <button
                onClick={() => handleAddPoint('away')}
                disabled={isDebouncingAddPoint || Boolean(pendingCommandId)}
                style={{
                  width: '100%',
                  height: '70px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: '900',
                  letterSpacing: '1px',
                  cursor: isDebouncingAddPoint ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isDebouncingAddPoint ? 0.6 : 1
                }}
              >
                <Plus style={{ width: '22px', height: '22px' }} />
                +1 PUNTO ({aName})
              </button>

              <button
                onClick={() => requestConfirmedAction('SUB_POINT', { team: 'away' }, 'CORREGIR -1 PUNTO (VISITANTE)', `¿Deseas restar 1 punto al equipo ${aName}?`)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Minus style={{ width: '12px', height: '12px' }} />
                -1 Punto Corrección
              </button>
            </div>
          </div>
        </div>

        {/* Excluded Actions Notice Box */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#070a12',
          border: '1px solid #1e293b',
          padding: '10px 14px',
          borderRadius: '6px',
          marginTop: '16px',
          fontSize: '11px',
          color: '#94a3b8',
          fontFamily: 'monospace'
        }}>
          <AlertOctagon style={{ width: '15px', height: '15px', color: '#fbbf24', flexShrink: 0 }} />
          <span>
            Acciones excluidas por seguridad: Reiniciar partido (`RESET_MATCH`), cerrar set (`FINISH_SET`) y edición estructural solo pueden realizarse desde la consola original `volleyball-control.html`.
          </span>
        </div>
      </div>

      {/* Local Audit Log Table */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', backgroundColor: '#070a12', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity style={{ width: '16px', height: '16px', color: '#a78bfa' }} />
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, color: '#f8fafc', fontFamily: 'monospace' }}>
              REGISTRO LOCAL DE AUDITORÍA DE COMANDOS ({auditLog.length})
            </h3>
          </div>

          <button
            onClick={() => volleyballControl.clearAuditLog()}
            disabled={auditLog.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              backgroundColor: '#1e293b',
              color: auditLog.length > 0 ? '#cbd5e1' : '#64748b',
              border: '1px solid #334155',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: auditLog.length > 0 ? 'pointer' : 'not-allowed'
            }}
          >
            <Trash2 style={{ width: '12px', height: '12px' }} />
            Limpiar Registro
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', fontFamily: 'monospace' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', borderBottom: '1px solid #1e293b' }}>
              <th style={{ padding: '10px 16px', width: '90px' }}>Hora</th>
              <th style={{ padding: '10px 16px' }}>Acción Solicitada</th>
              <th style={{ padding: '10px 16px', width: '140px' }}>Parámetros</th>
              <th style={{ padding: '10px 16px', width: '140px' }}>Estado Ack</th>
              <th style={{ padding: '10px 16px' }}>Resultado / Razón</th>
            </tr>
          </thead>
          <tbody>
            {auditLog.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                  Sin comandos registrados en esta sesión.
                </td>
              </tr>
            ) : (
              auditLog.map((entry) => (
                <tr key={entry.commandId} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '10px 16px', color: '#94a3b8' }}>
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '10px 16px', fontWeight: 'bold', color: '#ffffff' }}>
                    {entry.action}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#cbd5e1' }}>
                    {entry.params ? JSON.stringify(entry.params) : 'N/A'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontWeight: 'bold',
                      fontSize: '10px',
                      backgroundColor:
                        entry.status === 'ACCEPTED' ? 'rgba(16, 185, 129, 0.15)' :
                        entry.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.15)' :
                        entry.status === 'EXPIRED' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                      color:
                        entry.status === 'ACCEPTED' ? '#34d399' :
                        entry.status === 'REJECTED' ? '#f87171' :
                        entry.status === 'EXPIRED' ? '#fbbf24' : '#38bdf8',
                      border:
                        entry.status === 'ACCEPTED' ? '1px solid rgba(16, 185, 129, 0.3)' :
                        entry.status === 'REJECTED' ? '1px solid rgba(239, 68, 68, 0.3)' :
                        entry.status === 'EXPIRED' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)'
                    }}>
                      {entry.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#94a3b8' }}>
                    {entry.reason || (entry.status === 'REQUESTED' ? 'Esperando Acknowledgment...' : 'OK')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal for Session Enablement */}
      {showSessionEnableModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #38bdf8',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '480px',
            width: '90vw',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#38bdf8' }}>
              <ShieldAlert style={{ width: '24px', height: '24px' }} />
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, fontFamily: '"Outfit", sans-serif' }}>
                ACTIVACIÓN EXPLÍCITA DE CONTROL MANUAL
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
              ¿Deseas habilitar la transmisión de comandos manuales hacia <strong>Volleyball Control2</strong> para esta sesión activa?
            </p>
            <div style={{ fontSize: '11px', color: '#94a3b8', backgroundColor: '#070a12', padding: '10px', borderRadius: '6px', fontFamily: 'monospace' }}>
              • Esta función permite sumar/corregir puntos y cambiar el saque desde Vento.<br />
              • La autorización expira al cerrar o recargar la pestaña.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={() => setShowSessionEnableModal(false)}
                style={{ padding: '8px 16px', backgroundColor: '#1e293b', color: '#cbd5e1', borderRadius: '6px', border: '1px solid #334155', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
              >
                CANCELAR
              </button>
              <button
                onClick={confirmEnableSession}
                style={{ padding: '8px 16px', backgroundColor: '#0284c7', color: '#ffffff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
              >
                HABILITAR CONTROL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for High-Impact Actions */}
      {pendingConfirmAction && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #eab308',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '460px',
            width: '90vw',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fbbf24' }}>
              <AlertTriangle style={{ width: '22px', height: '22px' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, fontFamily: '"Outfit", sans-serif' }}>
                {pendingConfirmAction.title}
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
              {pendingConfirmAction.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={() => setPendingConfirmAction(null)}
                style={{ padding: '8px 16px', backgroundColor: '#1e293b', color: '#cbd5e1', borderRadius: '6px', border: '1px solid #334155', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
              >
                CANCELAR
              </button>
              <button
                onClick={executeConfirmedAction}
                style={{ padding: '8px 16px', backgroundColor: '#d97706', color: '#ffffff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
              >
                CONFIRMAR Y ENVIAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
