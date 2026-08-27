import React from 'react';
import type { SwitcherStore } from '../../store/useSwitcherStore';
import {
  ListFilter,
  Trash2,
  Tv,
  Eye,
  ArrowRight,
  Clock,
  Film,
  Star,
  Info,
  Radio,
  Cpu,
  Truck
} from 'lucide-react';

interface DirectionEventsLogProps {
  store: SwitcherStore;
}

export const DirectionEventsLog: React.FC<DirectionEventsLogProps> = ({ store }) => {
  const { eventsLog, replayMarkers, toggleReplayMarker, clearEventsLog } = store;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header Panel */}
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
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ListFilter style={{ width: '20px', height: '20px', color: '#ffffff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, fontFamily: '"Outfit", sans-serif' }}>
                REGISTRO CRONOLÓGICO DE EVENTOS Y MARCAS DE REPLAY DE DIRECCIÓN
              </h1>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                fontSize: '11px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                {eventsLog.length} Eventos Registrados
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Telemetría unificada en tiempo real de Production Bridge (ATEM, OBS, Resolume, DeckLink, Truck)
            </p>
          </div>
        </div>

        {eventsLog.length > 0 && (
          <button
            onClick={clearEventsLog}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
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
            Limpiar Historial
          </button>
        )}
      </div>

      {/* Mandatory Observability Notice */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: '#0f172a',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        padding: '12px 16px',
        borderRadius: '6px',
        marginBottom: '20px',
        fontSize: '12px',
        color: '#93c5fd',
        fontFamily: 'monospace'
      }}>
        <Info style={{ width: '16px', height: '16px', color: '#60a5fa', flexShrink: 0 }} />
        <span>
          <strong>Observabilidad Técnica:</strong> Eventos sincronizados pasivamente desde Production Bridge. Marca cualquier corte para añadirlo al panel de Replay.
        </span>
      </div>

      {/* Main Events Table */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', fontFamily: 'monospace' }}>
          <thead>
            <tr style={{ backgroundColor: '#070a12', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', borderBottom: '1px solid #1e293b' }}>
              <th style={{ padding: '12px 16px', width: '100px' }}>Hora</th>
              <th style={{ padding: '12px 16px', width: '120px' }}>Tipo</th>
              <th style={{ padding: '12px 16px' }}>Origen / Evento</th>
              <th style={{ padding: '12px 16px' }}>Detalle / Transición</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', width: '150px' }}>Asistencia Replay</th>
            </tr>
          </thead>
          <tbody>
            {eventsLog.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                  Sin eventos registrados en esta sesión.
                </td>
              </tr>
            ) : (
              eventsLog.map((evt, idx) => {
                const isReplayMarked = replayMarkers.some(m => m.id === evt.id || m.timestamp === evt.timestamp);
                const isPgm = evt.type === 'PROGRAM';

                return (
                  <tr
                    key={evt.id || idx}
                    style={{
                      borderBottom: '1px solid #1e293b',
                      backgroundColor: idx % 2 === 0 ? 'rgba(15, 23, 42, 0.5)' : 'transparent'
                    }}
                  >
                    {/* Timestamp */}
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 'bold' }}>
                      {evt.timestamp}
                    </td>

                    {/* Type Badge */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontWeight: 'bold',
                        fontSize: '10px',
                        backgroundColor: isPgm ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: isPgm ? '#f87171' : '#60a5fa',
                        border: isPgm ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)'
                      }}>
                        {evt.type}
                      </span>
                    </td>

                    {/* Source / Subsystem */}
                    <td style={{ padding: '12px 16px', color: '#ffffff', fontWeight: 'bold' }}>
                      {evt.previousSource || 'BRIDGE'}
                    </td>

                    {/* Details */}
                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                      {evt.newSource}
                    </td>

                    {/* Replay Marker Action */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => toggleReplayMarker(evt)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          backgroundColor: isReplayMarked ? 'rgba(217, 119, 6, 0.2)' : '#1e293b',
                          color: isReplayMarked ? '#fbbf24' : '#cbd5e1',
                          border: isReplayMarked ? '1px solid #d97706' : '1px solid #334155',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        <Star style={{ width: '12px', height: '12px', fill: isReplayMarked ? '#fbbf24' : 'none' }} />
                        {isReplayMarked ? 'MARCADO' : 'Marcar Replay'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
