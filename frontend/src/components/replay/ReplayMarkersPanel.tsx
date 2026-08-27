import React, { useState } from 'react';
import type { SwitcherStore } from '../../store/useSwitcherStore';
import { Film, Monitor, Trash2, ArrowRight, Star, Tag, Info, History, Truck, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ReplayMarkersPanelProps {
  store: SwitcherStore;
}

export const ReplayMarkersPanel: React.FC<ReplayMarkersPanelProps> = ({ store }) => {
  const {
    replayMarkers,
    lastBridgeData,
    removeReplayMarker,
    updateReplayMarkerNote,
    updateReplayMarkerPriority,
    clearReplayMarkers,
    setActiveTab
  } = store;

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');

  const truckInfo = lastBridgeData?.truck;
  const truckRunning = Boolean(truckInfo?.running);
  const truckOutputPresent = truckInfo?.outputPresent;
  const truckReplayReady = truckInfo?.replayReady;
  const truckReplaySource = truckInfo?.replaySource;
  const truckConfidence = truckInfo?.confidence || 'UNKNOWN';

  const handleStartEditNote = (markerId: string, currentNote: string) => {
    setEditingNoteId(markerId);
    setNoteText(currentNote);
  };

  const handleSaveNote = (markerId: string) => {
    updateReplayMarkerNote(markerId, noteText);
    setEditingNoteId(null);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Film style={{ width: '20px', height: '20px', color: '#ffffff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, fontFamily: '"Outfit", sans-serif' }}>
                MARCADORES DE DIRECCIÓN PARA REPLAY
              </h1>
              <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', backgroundColor: '#1e293b', color: '#fbbf24', padding: '2px 8px', borderRadius: '12px', border: '1px solid #d97706' }}>
                {replayMarkers.length} {replayMarkers.length === 1 ? 'marcador' : 'marcadores'}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Asistencia local de realización para auditoría y seguimiento de repeticiones destacadas
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setActiveTab('events')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              backgroundColor: '#1e293b',
              color: '#a78bfa',
              fontSize: '12px',
              fontWeight: 'bold',
              borderRadius: '6px',
              border: '1px solid #3b82f6',
              cursor: 'pointer'
            }}
          >
            <History style={{ width: '14px', height: '14px' }} />
            VER REGISTRO DE EVENTOS
          </button>

          {replayMarkers.length > 0 && (
            <button
              onClick={clearReplayMarkers}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 14px',
                backgroundColor: '#1e293b',
                color: '#f87171',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '6px',
                border: '1px solid #334155',
                cursor: 'pointer'
              }}
            >
              <Trash2 style={{ width: '14px', height: '14px' }} />
              Limpiar Marcadores
            </button>
          )}

          <button
            onClick={() => setActiveTab('multiviewer')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: '#00e676',
              color: '#052e16',
              fontSize: '13px',
              fontWeight: 'bold',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 230, 118, 0.3)'
            }}
          >
            <Monitor style={{ width: '16px', height: '16px' }} />
            VER MULTIVIEWER
          </button>
        </div>
      </div>

      {/* DEDICATED HUDL PRODUCTION TRUCK TELEMETRY CARD */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #3b82f6',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck style={{ width: '18px', height: '18px', color: '#60a5fa' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: '#ffffff', fontFamily: 'monospace' }}>
              TELEMETRÍA DE HARDWARE / SOFTWARE — HUDL PRODUCTION TRUCK
            </h3>
          </div>
          <span style={{
            fontSize: '10px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            CONFIDENCE: {truckConfidence}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '11px', fontFamily: 'monospace' }}>
          {/* Running State */}
          <div style={{ backgroundColor: '#070a12', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
            <div style={{ color: '#64748b', marginBottom: '4px' }}>PROCESO TRUCK:</div>
            <strong style={{ color: truckRunning ? '#34d399' : '#f87171' }}>
              {truckRunning ? '🟢 EJECUTÁNDOSE (v' + (truckInfo?.version || '4.15.0') + ')' : '🔴 NO DETECTADO'}
            </strong>
          </div>

          {/* Render Output Present */}
          <div style={{ backgroundColor: '#070a12', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
            <div style={{ color: '#64748b', marginBottom: '4px' }}>OUTPUT RENDER:</div>
            <strong style={{ color: truckOutputPresent?.value ? '#34d399' : '#94a3b8' }}>
              {truckOutputPresent?.value ? '🟢 ACTIVO' : '⚪ INACTIVO'} ({truckOutputPresent?.confidence || 'UNKNOWN'})
            </strong>
          </div>

          {/* Replay Ready State */}
          <div style={{ backgroundColor: '#070a12', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
            <div style={{ color: '#64748b', marginBottom: '4px' }}>REPLAY READY:</div>
            <strong style={{ color: truckReplayReady?.value === true ? '#34d399' : '#fbbf24' }}>
              {truckReplayReady?.value !== undefined && truckReplayReady?.value !== null ? (truckReplayReady.value ? 'SI' : 'NO') : 'UNKNOWN'} ({truckReplayReady?.confidence || 'UNKNOWN'})
            </strong>
          </div>

          {/* Replay Source */}
          <div style={{ backgroundColor: '#070a12', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
            <div style={{ color: '#64748b', marginBottom: '4px' }}>CANAL DE REPLAY:</div>
            <strong style={{ color: '#38bdf8' }}>
              {truckReplaySource?.value || 'UNKNOWN'}
            </strong>
          </div>
        </div>

        <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', marginTop: '10px' }}>
          * Regla de Seguridad: Marcadores locales de dirección != Estado de Replay de Production Truck. La renderización de video no implica disponibilidad de replay.
        </div>
      </div>

      {/* Main Markers Table / Empty State */}
      {replayMarkers.length === 0 ? (
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px border-dashed #1e293b',
          borderRadius: '8px',
          padding: '48px 24px',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <Film style={{ width: '48px', height: '48px', color: '#334155', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#94a3b8', margin: '0 0 6px 0' }}>
            No hay marcadores de replay en esta sesión
          </h3>
          <p style={{ fontSize: '12px', color: '#64748b', maxWidth: '480px', margin: '0 auto 16px auto' }}>
            Abre el Registro de Eventos para marcar los cortes a Program más importantes como candidatos a repetición.
          </p>
          <button
            onClick={() => setActiveTab('events')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#d97706',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 'bold',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Ir al Registro de Eventos
          </button>
        </div>
      ) : (
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#070a12', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontFamily: 'monospace', borderBottom: '1px solid #1e293b' }}>
                <th style={{ padding: '12px 16px', width: '100px' }}>Hora</th>
                <th style={{ padding: '12px 16px', width: '140px' }}>Prioridad</th>
                <th style={{ padding: '12px 16px', width: '140px' }}>Fuente al Aire</th>
                <th style={{ padding: '12px 16px', width: '200px' }}>Transición</th>
                <th style={{ padding: '12px 16px' }}>Nota del Director</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', width: '110px' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {replayMarkers.map((marker, index) => {
                const isHigh = marker.priority === 'high';

                return (
                  <tr
                    key={marker.id}
                    style={{
                      borderBottom: '1px solid #1e293b',
                      backgroundColor: index % 2 === 0 ? 'rgba(15, 23, 42, 0.5)' : 'transparent'
                    }}
                  >
                    {/* Timestamp */}
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 'bold', color: '#94a3b8' }}>
                      {marker.timestamp}
                    </td>

                    {/* Priority Badge */}
                    <td style={{ padding: '12px 16px' }}>
                      {isHigh ? (
                        <button
                          onClick={() => updateReplayMarkerPriority(marker.id, 'normal')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            backgroundColor: 'rgba(217, 119, 6, 0.2)',
                            color: '#fbbf24',
                            border: '1px solid rgba(217, 119, 6, 0.5)',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <Star style={{ width: '11px', height: '11px', fill: '#fbbf24' }} />
                          PRIORITARIO
                        </button>
                      ) : (
                        <button
                          onClick={() => updateReplayMarkerPriority(marker.id, 'high')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            backgroundColor: 'rgba(3, 105, 161, 0.2)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <Tag style={{ width: '11px', height: '11px' }} />
                          NORMAL
                        </button>
                      )}
                    </td>

                    {/* On Air Source */}
                    <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#ffffff', fontFamily: 'monospace' }}>
                      <span style={{ padding: '2px 8px', backgroundColor: 'rgba(255, 42, 77, 0.2)', borderRadius: '4px', border: '1px solid #ff4d6d' }}>
                        {marker.onAirSource}
                      </span>
                    </td>

                    {/* Transition */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                        <span style={{ color: '#94a3b8' }}>{marker.previousSource}</span>
                        <ArrowRight style={{ width: '12px', height: '12px', color: '#ff4d6d' }} />
                        <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{marker.onAirSource}</span>
                      </div>
                    </td>

                    {/* Note Input */}
                    <td style={{ padding: '12px 16px' }}>
                      {editingNoteId === marker.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="text"
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            placeholder="Añade una nota breve..."
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleSaveNote(marker.id)}
                            style={{
                              backgroundColor: '#070a12',
                              border: '1px solid #3b82f6',
                              color: '#ffffff',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              width: '100%',
                              fontFamily: 'sans-serif'
                            }}
                          />
                          <button
                            onClick={() => handleSaveNote(marker.id)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleStartEditNote(marker.id, marker.note)}
                          style={{
                            color: marker.note ? '#f1f5f9' : '#64748b',
                            fontSize: '12px',
                            fontStyle: marker.note ? 'normal' : 'italic',
                            cursor: 'pointer',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            backgroundColor: marker.note ? '#070a12' : 'transparent',
                            border: '1px solid transparent'
                          }}
                        >
                          {marker.note || '+ Añadir nota (ej. Bloqueo, Punto decisivo...)'}
                        </div>
                      )}
                    </td>

                    {/* Remove Action */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => removeReplayMarker(marker.id)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#1e293b',
                          color: '#f87171',
                          fontSize: '11px',
                          borderRadius: '4px',
                          border: '1px solid #334155',
                          cursor: 'pointer'
                        }}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
