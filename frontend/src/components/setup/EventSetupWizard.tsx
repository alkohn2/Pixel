import React, { useState, useEffect } from 'react';
import type { SwitcherStore } from '../../store/useSwitcherStore';
import type { EventSelectedModules } from '../../types/profiles';
import { getDefaultPhysicalSignalMap } from '../../types/sources';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Play,
  Save,
  Sliders,
  Video,
  Truck,
  Film,
  Layers,
  Volleyball,
  ArrowRight,
  Edit2,
  RefreshCw
} from 'lucide-react';

interface EventSetupWizardProps {
  store: SwitcherStore;
}

export const EventSetupWizard: React.FC<EventSetupWizardProps> = ({ store }) => {
  const {
    profiles,
    activeProfileId,
    loadProfile,
    duplicateProfile,
    updateProfileEventSetup,
    updatePhysicalSignalMappingAction,
    bridgeState,
    obsStatus,
    resolumeStatus,
    volleyballStatus,
    setActiveTab
  } = store;

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];
  const physicalMap = activeProfile.physicalSignalMap || getDefaultPhysicalSignalMap();

  // Paso 1 State: Event Profile Info
  const [eventName, setEventName] = useState<string>(activeProfile.eventName || `${activeProfile.name} - En Vivo`);
  const [sport, setSport] = useState<string>(activeProfile.sport || 'Voleibol');
  const [eventDate, setEventDate] = useState<string>(
    activeProfile.eventDate || new Date().toISOString().split('T')[0]
  );

  // Paso 2 State: Selected Modules Today
  const [selectedModules, setSelectedModules] = useState<EventSelectedModules>(
    activeProfile.selectedModules || {
      cameras: true,
      truck: true,
      obs: true,
      resolume: true,
      volleyball: true
    }
  );

  // Paso 3 State: Selected Channel for Traceability Modal
  const [selectedSignalChannelId, setSelectedSignalChannelId] = useState<number | null>(null);

  // Paso 4 State: Preflight Run Status
  const [hasRunPreflight, setHasRunPreflight] = useState<boolean>(false);
  const [preflightStatus, setPreflightStatus] = useState<'ready' | 'warning' | 'error' | null>(null);
  const [preflightLogs, setPreflightLogs] = useState<Array<{ type: 'ok' | 'warn' | 'error'; msg: string }>>([]);

  // Save confirmation Toast
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Sync state when activeProfileId changes
  useEffect(() => {
    setEventName(activeProfile.eventName || `${activeProfile.name} - En Vivo`);
    setSport(activeProfile.sport || 'Voleibol');
    setEventDate(activeProfile.eventDate || new Date().toISOString().split('T')[0]);
    if (activeProfile.selectedModules) {
      setSelectedModules(activeProfile.selectedModules);
    }
    setHasRunPreflight(false);
    setPreflightStatus(null);
  }, [activeProfileId, activeProfile]);

  // Handle Duplicating Profile for Event (Directive 1)
  const handleDuplicateProfileForEvent = () => {
    const defaultNewName = `${activeProfile.name}_EVENTO_${new Date().toISOString().slice(5, 10).replace('-', '')}`;
    const name = prompt('Introduce el nombre para el nuevo perfil del evento:', defaultNewName);
    if (name && name.trim()) {
      duplicateProfile(name.trim());
    }
  };

  // Toggle Module Selection
  const toggleModule = (moduleKey: keyof EventSelectedModules) => {
    setSelectedModules(prev => ({
      ...prev,
      [moduleKey]: !prev[moduleKey]
    }));
    setHasRunPreflight(false);
  };

  // Execute Event-Specific Preflight Check (Directive 2 & 3)
  const runEventPreflight = () => {
    const logs: Array<{ type: 'ok' | 'warn' | 'error'; msg: string }> = [];
    let hasError = false;
    let hasWarn = false;

    // 1. Mandatory Core Check: Production Bridge / ATEM (ALWAYS BLOCKS IF DOWN)
    if (bridgeState === 'connected') {
      logs.push({ type: 'ok', msg: 'Production Bridge / ATEM Television Studio Pro HD: Conectado pasivamente (:3000)' });
    } else if (bridgeState === 'stale') {
      hasWarn = true;
      logs.push({ type: 'warn', msg: 'Production Bridge en espera: Datos pasivos de switcher conservados' });
    } else {
      hasError = true;
      logs.push({ type: 'error', msg: 'CRÍTICO: Production Bridge / ATEM no disponible. La producción no puede continuar sin el switcher.' });
    }

    // 2. Cámara(s) Module Check (Only if selected today)
    if (selectedModules.cameras) {
      const camVerified = physicalMap.some(m => m.logicalSourceName === 'CAM_1' && m.mappingStatus === 'VERIFICADO');
      if (camVerified) {
        logs.push({ type: 'ok', msg: 'Cámara 1: Ruta confirmada (DeckLink Quad (5) BNC 3 → ATEM BNC 1)' });
      } else {
        hasError = true;
        logs.push({ type: 'error', msg: 'Cámara(s) seleccionada pero falta verificar la ruta física en DeckLink Quad (5).' });
      }
    } else {
      logs.push({ type: 'ok', msg: 'Cámara(s): Módulo no seleccionado para este evento (Omitido en preflight)' });
    }

    // 3. Production Truck Check (Only if selected today)
    if (selectedModules.truck) {
      const truckVerified = physicalMap.some(m => m.logicalSourceName === 'TRUCK_PGM' && m.mappingStatus === 'VERIFICADO');
      if (truckVerified) {
        logs.push({ type: 'ok', msg: 'Production Truck: Program Output 1 verificado en DeckLink Quad (2) (4.º BNC → ATEM BNC 4)' });
      } else {
        hasError = true;
        logs.push({ type: 'error', msg: 'Production Truck seleccionado pero falta confirmación física de ruta en DeckLink Quad (2).' });
      }
    } else {
      logs.push({ type: 'ok', msg: 'Production Truck: Módulo no seleccionado para este evento (Omitido)' });
    }

    // 4. OBS Studio Check (Only if selected today)
    if (selectedModules.obs) {
      const obsRouteVerified = physicalMap.some(m => m.logicalSourceName === 'OBS' && m.mappingStatus === 'VERIFICADO');
      if (obsStatus?.connected && obsRouteVerified) {
        logs.push({ type: 'ok', msg: `OBS Studio: Conectado WebSocket v5 (${obsStatus.obsVersion}) y Ruta física verificada (DeckLink Quad (6) → ATEM BNC 3)` });
      } else if (!obsStatus?.connected && !obsRouteVerified) {
        hasError = true;
        logs.push({ type: 'error', msg: 'OBS Studio seleccionado pero no hay conexión WebSocket v5 ni ruta física verificada en DeckLink Quad (6).' });
      } else if (!obsStatus?.connected) {
        hasError = true;
        logs.push({ type: 'error', msg: 'OBS Studio seleccionado pero la integración pasiva WebSocket v5 está sin conexión.' });
      } else {
        hasError = true;
        logs.push({ type: 'error', msg: 'OBS Studio seleccionado pero la ruta física en DeckLink Quad (6) no está verificada en el mapa.' });
      }
    } else {
      logs.push({ type: 'ok', msg: 'OBS Studio: Módulo no seleccionado para este evento (No bloquea la transmisión)' });
    }

    // 5. Resolume Arena Check (Only if selected today)
    if (selectedModules.resolume) {
      const resolumeRouteVerified = physicalMap.some(m => m.logicalSourceName === 'RESOLUME' && m.mappingStatus === 'VERIFICADO');
      if (resolumeStatus?.connected && resolumeRouteVerified) {
        logs.push({ type: 'ok', msg: `Resolume Arena: Conectado (${resolumeStatus.productName} v${resolumeStatus.version}) y Ruta física verificada (DeckLink Quad (1) → ATEM BNC 2)` });
      } else if (!resolumeStatus?.connected && !resolumeRouteVerified) {
        hasError = true;
        logs.push({ type: 'error', msg: 'Resolume Arena seleccionado pero no hay conexión web API ni ruta física verificada en DeckLink Quad (1).' });
      } else if (!resolumeStatus?.connected) {
        hasError = true;
        logs.push({ type: 'error', msg: 'Resolume Arena seleccionado pero la API del servidor web (8080) está sin conexión.' });
      } else {
        hasError = true;
        logs.push({ type: 'error', msg: 'Resolume Arena seleccionado pero la ruta física en DeckLink Quad (1) no está verificada en el mapa.' });
      }
    } else {
      logs.push({ type: 'ok', msg: 'Resolume Arena: Módulo no seleccionado para este evento (No bloquea la transmisión)' });
    }

    // 6. Volleyball Control2 Check (Only if selected today)
    if (selectedModules.volleyball) {
      if (volleyballStatus.hasData) {
        logs.push({ type: 'ok', msg: 'Volleyball Control2: Marcador en vivo activo recibido vía BroadcastChannel' });
      } else {
        hasWarn = true;
        logs.push({ type: 'warn', msg: 'Volleyball Control2 seleccionado pero no se detecta transmisión activa del marcador (En espera).' });
      }
    } else {
      logs.push({ type: 'ok', msg: 'Volleyball Control2: Módulo no seleccionado para este evento (Omitido)' });
    }

    setPreflightLogs(logs);
    setHasRunPreflight(true);
    if (hasError) {
      setPreflightStatus('error');
    } else if (hasWarn) {
      setPreflightStatus('warning');
    } else {
      setPreflightStatus('ready');
    }
  };

  // Save Event Preparation (Directive 5)
  const handleSavePreparation = () => {
    updateProfileEventSetup(activeProfileId, eventName, sport, eventDate, selectedModules);
    setSaveToast(`¡Preparación del evento "${eventName}" guardada en perfil [${activeProfile.name}]!`);
    setTimeout(() => setSaveToast(null), 4000);
  };

  // Verified Routes List
  const verifiedRoutes = physicalMap.filter(row => row.mappingStatus === 'VERIFICADO');
  const selectedRowForModal = physicalMap.find(row => row.decklinkChannelId === selectedSignalChannelId);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      {/* Toast Banner */}
      {saveToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 200,
          backgroundColor: '#059669',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          fontWeight: 'bold',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle2 style={{ width: '18px', height: '18px' }} />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Hero Header Wizard Banner */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #3b82f6',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 24px rgba(59, 130, 246, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(37, 99, 235, 0.5)' }}>
            <Sparkles style={{ width: '26px', height: '26px', color: '#ffffff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0, fontFamily: '"Outfit", sans-serif', color: '#ffffff' }}>
                SETUP RÁPIDO POR EVENTO
              </h1>
              <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace', padding: '2px 8px', borderRadius: '4px' }}>
                ASISTENTE DE PREPARACIÓN
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Prepara una producción nueva sin modificar cables físicos. Selecciona los módulos de hoy, verifica tus rutas y valida el evento antes de salir al aire.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setActiveTab('configuration')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              backgroundColor: '#1e293b',
              color: '#cbd5e1',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            <Sliders style={{ width: '14px', height: '14px', color: '#60a5fa' }} />
            <span>Configuración Avanzada</span>
          </button>

          <button
            onClick={() => setActiveTab('multiviewer')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(5, 150, 105, 0.3)'
            }}
          >
            <Play style={{ width: '14px', height: '14px' }} />
            <span>ABRIR MULTIVIEWER</span>
          </button>
        </div>
      </div>

      {/* STEPPER GRID — 5 CLEAR GUIDED STEPS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ========================================== */}
        {/* PASO 1: PERFIL DEL EVENTO */}
        {/* ========================================== */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#3b82f6', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', fontFamily: 'monospace' }}>
                1
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#ffffff', fontFamily: '"Outfit", sans-serif' }}>
                  PASO 1: PERFIL DEL EVENTO
                </h3>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  Selecciona o duplica un perfil base y registra la información del evento actual.
                </span>
              </div>
            </div>

            <button
              onClick={handleDuplicateProfileForEvent}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(29, 78, 216, 0.3)'
              }}
              title="Duplica el perfil actual conservando sus rutas verificadas como punto de partida"
            >
              <Copy style={{ width: '14px', height: '14px' }} />
              <span>Crear Perfil para este Evento</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr', gap: '16px', alignItems: 'center' }}>
            {/* Active Profile Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'monospace' }}>
                Perfil Base Activo:
              </label>
              <select
                value={activeProfileId}
                onChange={e => loadProfile(e.target.value)}
                style={{
                  backgroundColor: '#070a12',
                  border: '1px solid #3b82f6',
                  color: '#ffffff',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  width: '100%',
                  cursor: 'pointer'
                }}
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isBuiltin ? '(Fábrica)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Event Name */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'monospace' }}>
                Nombre del Evento:
              </label>
              <input
                type="text"
                value={eventName}
                onChange={e => setEventName(e.target.value)}
                placeholder="Ej. Torneo Voleibol Liga 2026"
                style={{
                  backgroundColor: '#070a12',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  width: '100%'
                }}
              />
            </div>

            {/* Sport */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'monospace' }}>
                Deporte / Disciplina:
              </label>
              <input
                type="text"
                value={sport}
                onChange={e => setSport(e.target.value)}
                placeholder="Ej. Voleibol"
                style={{
                  backgroundColor: '#070a12',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  width: '100%'
                }}
              />
            </div>

            {/* Event Date */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'monospace' }}>
                Fecha del Evento:
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                style={{
                  backgroundColor: '#070a12',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  width: '100%'
                }}
              />
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* PASO 2: MÓDULOS QUE SE USARÁN HOY */}
        {/* ========================================== */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#8b5cf6', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', fontFamily: 'monospace' }}>
                2
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#ffffff', fontFamily: '"Outfit", sans-serif' }}>
                  PASO 2: MÓDULOS QUE SE USARÁN HOY
                </h3>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  Marca únicamente los sistemas que participarán hoy. PIXEL es 100% pasivo y no alterará hardware ni software.
                </span>
              </div>
            </div>

            <span style={{ fontSize: '11px', color: '#8b5cf6', fontFamily: 'monospace', fontWeight: 'bold' }}>
              [PLANIFICACIÓN PASIVA DE PRODUCCIÓN]
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
            {/* 1. Cámara(s) Module Switch */}
            <div style={{
              backgroundColor: selectedModules.cameras ? 'rgba(16, 185, 129, 0.1)' : '#070a12',
              border: selectedModules.cameras ? '1px solid #10b981' : '1px solid #1e293b',
              borderRadius: '8px',
              padding: '14px',
              transition: 'all 0.2s ease'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={selectedModules.cameras}
                  onChange={() => toggleModule('cameras')}
                  style={{ width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Video style={{ width: '16px', height: '16px', color: '#10b981' }} />
                  <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#ffffff' }}>Cámara(s)</span>
                </div>
              </label>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8' }}>
                {physicalMap.some(m => m.logicalSourceName === 'CAM_1' && m.mappingStatus === 'VERIFICADO') ? (
                  <span style={{ color: '#34d399', fontWeight: 'bold' }}>🟢 CAM_1 Verificada</span>
                ) : (
                  <span style={{ color: '#fbbf24' }}>🟡 Pendiente de confirmación</span>
                )}
              </div>
            </div>

            {/* 2. Production Truck Module Switch */}
            <div style={{
              backgroundColor: selectedModules.truck ? 'rgba(245, 158, 11, 0.1)' : '#070a12',
              border: selectedModules.truck ? '1px solid #f59e0b' : '1px solid #1e293b',
              borderRadius: '8px',
              padding: '14px',
              transition: 'all 0.2s ease'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={selectedModules.truck}
                  onChange={() => toggleModule('truck')}
                  style={{ width: '16px', height: '16px', accentColor: '#f59e0b', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck style={{ width: '16px', height: '16px', color: '#f59e0b' }} />
                  <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#ffffff' }}>Production Truck</span>
                </div>
              </label>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8' }}>
                {physicalMap.some(m => m.logicalSourceName === 'TRUCK_PGM' && m.mappingStatus === 'VERIFICADO') ? (
                  <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>🟡 TRUCK_PGM Verificado</span>
                ) : (
                  <span style={{ color: '#94a3b8' }}>⚪ Sin cable verificado</span>
                )}
              </div>
            </div>

            {/* 3. OBS Studio Module Switch */}
            <div style={{
              backgroundColor: selectedModules.obs ? 'rgba(59, 130, 246, 0.1)' : '#070a12',
              border: selectedModules.obs ? '1px solid #3b82f6' : '1px solid #1e293b',
              borderRadius: '8px',
              padding: '14px',
              transition: 'all 0.2s ease'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={selectedModules.obs}
                  onChange={() => toggleModule('obs')}
                  style={{ width: '16px', height: '16px', accentColor: '#3b82f6', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Film style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
                  <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#ffffff' }}>OBS Studio</span>
                </div>
              </label>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8' }}>
                {obsStatus?.connected ? (
                  <span style={{ color: '#34d399', fontWeight: 'bold' }}>🟢 WS v5 Conectado</span>
                ) : (
                  <span style={{ color: '#94a3b8' }}>⚪ Sin conexión activa</span>
                )}
              </div>
            </div>

            {/* 4. Resolume Arena Module Switch */}
            <div style={{
              backgroundColor: selectedModules.resolume ? 'rgba(168, 85, 247, 0.1)' : '#070a12',
              border: selectedModules.resolume ? '1px solid #a855f7' : '1px solid #1e293b',
              borderRadius: '8px',
              padding: '14px',
              transition: 'all 0.2s ease'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={selectedModules.resolume}
                  onChange={() => toggleModule('resolume')}
                  style={{ width: '16px', height: '16px', accentColor: '#a855f7', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers style={{ width: '16px', height: '16px', color: '#a855f7' }} />
                  <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#ffffff' }}>Resolume Arena</span>
                </div>
              </label>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8' }}>
                {resolumeStatus?.connected ? (
                  <span style={{ color: '#c084fc', fontWeight: 'bold' }}>🟣 Web API Conectado</span>
                ) : (
                  <span style={{ color: '#94a3b8' }}>⚪ Sin conexión activa</span>
                )}
              </div>
            </div>

            {/* 5. Volleyball Control2 Module Switch */}
            <div style={{
              backgroundColor: selectedModules.volleyball ? 'rgba(56, 189, 248, 0.1)' : '#070a12',
              border: selectedModules.volleyball ? '1px solid #38bdf8' : '1px solid #1e293b',
              borderRadius: '8px',
              padding: '14px',
              transition: 'all 0.2s ease'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={selectedModules.volleyball}
                  onChange={() => toggleModule('volleyball')}
                  style={{ width: '16px', height: '16px', accentColor: '#38bdf8', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Volleyball style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
                  <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#ffffff' }}>Volleyball Control</span>
                </div>
              </label>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8' }}>
                {volleyballStatus.hasData ? (
                  <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>🔵 Marcador Activo</span>
                ) : (
                  <span style={{ color: '#94a3b8' }}>⚪ Sin datos en vivo</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* PASO 3: RUTAS DE VIDEO DEL EVENTO */}
        {/* ========================================== */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', fontFamily: 'monospace' }}>
                3
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#ffffff', fontFamily: '"Outfit", sans-serif' }}>
                  PASO 3: RUTAS DE VIDEO VERIFICADAS DEL EVENTO
                </h3>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  Rutas de señal confirmadas en el perfil actual. Usa el botón "Editar ruta" para abrir la matriz de trazabilidad.
                </span>
              </div>
            </div>

            <span style={{ fontSize: '11px', color: '#10b981', fontFamily: 'monospace', fontWeight: 'bold' }}>
              [{verifiedRoutes.length} RUTAS VERIFICADAS DISPONIBLES]
            </span>
          </div>

          {verifiedRoutes.length === 0 ? (
            <div style={{ backgroundColor: '#070a12', border: '1px dashed #eab308', padding: '16px', borderRadius: '8px', textAlign: 'center', color: '#eab308', fontSize: '13px', fontFamily: 'monospace' }}>
              ⚠️ No hay rutas físicas verificadas en este perfil. Haz clic en el botón "Configuración Avanzada" o edita un canal para confirmar cableado.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {verifiedRoutes.map(route => {
                const colorMap: Record<string, string> = {
                  CAM_1: '#10b981',
                  OBS: '#3b82f6',
                  RESOLUME: '#a855f7',
                  TRUCK_PGM: '#f59e0b'
                };
                const badgeColor = colorMap[route.logicalSourceName] || '#34d399';

                return (
                  <div
                    key={route.decklinkChannelId}
                    style={{
                      backgroundColor: '#070a12',
                      border: `1px solid ${badgeColor}55`,
                      borderRadius: '8px',
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ backgroundColor: `${badgeColor}22`, color: badgeColor, border: `1px solid ${badgeColor}`, fontWeight: 'bold', fontSize: '11px', fontFamily: 'monospace', padding: '2px 8px', borderRadius: '4px' }}>
                          {route.logicalSourceName}
                        </span>
                        <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: 'bold' }}>
                          {route.decklinkChannelName}
                        </span>
                        <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace', padding: '1px 6px', borderRadius: '3px' }}>
                          🟢 VERIFICADO
                        </span>
                      </div>

                      {/* Route flow text */}
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>{route.cableOriginDestination}</span>
                        <ArrowRight style={{ width: '12px', height: '12px', color: '#64748b' }} />
                        <span style={{ color: '#38bdf8' }}>{route.physicalConnectorPosition}</span>
                        <ArrowRight style={{ width: '12px', height: '12px', color: '#64748b' }} />
                        <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{route.atemInputLabel}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedSignalChannelId(route.decklinkChannelId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        backgroundColor: '#1e293b',
                        color: '#cbd5e1',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                      title="Abre el modal de trazabilidad física de 4 capas"
                    >
                      <Edit2 style={{ width: '12px', height: '12px', color: '#60a5fa' }} />
                      <span>Editar ruta</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* PASO 4: COMPROBACIÓN PREVIA (PREFLIGHT POR EVENTO) */}
        {/* ========================================== */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f59e0b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', fontFamily: 'monospace' }}>
                4
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#ffffff', fontFamily: '"Outfit", sans-serif' }}>
                  PASO 4: COMPROBACIÓN PREVIA (PREFLIGHT INTELIGENTE DEL EVENTO)
                </h3>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  Verifica que los componentes seleccionados hoy estén listos. Los módulos desmarcados no bloquean el preflight.
                </span>
              </div>
            </div>

            <button
              onClick={runEventPreflight}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(2, 132, 199, 0.3)'
              }}
            >
              <RefreshCw style={{ width: '15px', height: '15px' }} />
              <span>Ejecutar Preflight del Evento</span>
            </button>
          </div>

          {/* Preflight Result Banner */}
          {hasRunPreflight && preflightStatus && (
            <div style={{
              backgroundColor: preflightStatus === 'ready' ? 'rgba(6, 78, 59, 0.3)' : preflightStatus === 'warning' ? 'rgba(120, 53, 15, 0.3)' : 'rgba(127, 29, 29, 0.3)',
              border: preflightStatus === 'ready' ? '1px solid #10b981' : preflightStatus === 'warning' ? '1px solid #f59e0b' : '1px solid #ef4444',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                {preflightStatus === 'ready' ? (
                  <CheckCircle2 style={{ width: '24px', height: '24px', color: '#34d399' }} />
                ) : preflightStatus === 'warning' ? (
                  <AlertTriangle style={{ width: '24px', height: '24px', color: '#fbbf24' }} />
                ) : (
                  <XCircle style={{ width: '24px', height: '24px', color: '#f87171' }} />
                )}
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, color: '#ffffff', fontFamily: '"Outfit", sans-serif' }}>
                    {preflightStatus === 'ready'
                      ? `🟢 SISTEMA LISTO PARA TRANSMISIÓN — PERFIL [${activeProfile.name}]`
                      : preflightStatus === 'warning'
                      ? `🟡 LISTO CON ADVERTENCIAS — PERFIL [${activeProfile.name}]`
                      : `🔴 FALTAN RUTAS O CONEXIONES REQUERIDAS — PERFIL [${activeProfile.name}]`}
                  </h4>
                  <span style={{ fontSize: '11px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                    {preflightStatus === 'ready'
                      ? 'Todos los módulos seleccionados para hoy y el switcher ATEM tienen observabilidad limpia.'
                      : preflightStatus === 'warning'
                      ? 'El switcher ATEM está operativo. Hay advertencias menores en módulos seleccionados.'
                      : 'Un componente seleccionado para hoy o el switcher ATEM no supera la comprobación previa.'}
                  </span>
                </div>
              </div>

              {/* Log List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#070a12', padding: '12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                {preflightLogs.map((log, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontFamily: 'monospace' }}>
                    {log.type === 'ok' ? (
                      <span style={{ color: '#34d399' }}>🟢 OK:</span>
                    ) : log.type === 'warn' ? (
                      <span style={{ color: '#fbbf24' }}>🟡 ADVERTENCIA:</span>
                    ) : (
                      <span style={{ color: '#f87171', fontWeight: 'bold' }}>🔴 BLOQUEANTE:</span>
                    )}
                    <span style={{ color: '#e2e8f0' }}>{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* PASO 5: GUARDAR Y ABRIR MULTIVIEWER */}
        {/* ========================================== */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #10b981', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#059669', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', fontFamily: 'monospace' }}>
                5
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#ffffff', fontFamily: '"Outfit", sans-serif' }}>
                  PASO 5: GUARDAR Y ABRIR MULTIVIEWER
                </h3>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  Guarda la preparación en el perfil activo y abre el monitor principal de dirección.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={handleSavePreparation}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  backgroundColor: '#1e293b',
                  color: '#34d399',
                  border: '1px solid #059669',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                <Save style={{ width: '16px', height: '16px' }} />
                <span>Guardar Preparación del Evento</span>
              </button>

              <button
                onClick={() => {
                  handleSavePreparation();
                  setActiveTab('multiviewer');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(5, 150, 105, 0.4)'
                }}
              >
                <Play style={{ width: '16px', height: '16px' }} />
                <span>ABRIR MULTIVIEWER</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* TRACEABILITY 4-LAYER MODAL FOR EDITING ROUTE */}
      {/* ========================================== */}
      {selectedSignalChannelId !== null && selectedRowForModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #3b82f6',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '680px',
            width: '90vw',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.9)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>🔍</span>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#ffffff', fontFamily: '"Outfit", sans-serif' }}>
                    EDITAR TRAZABILIDAD FÍSICA — CANAL DECKLINK QUAD ({selectedRowForModal.decklinkChannelId})
                  </h3>
                  <span style={{ fontSize: '11px', color: '#60a5fa', fontFamily: 'monospace' }}>
                    Configuración de 4 capas pasivas de trazabilidad
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedSignalChannelId(null)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px', fontFamily: 'monospace' }}>
              {/* Capa 1: Fuente / Software */}
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>
                  1. FUENTE ORIGEN DE VIDEO / SOFTWARE:
                </label>
                <input
                  type="text"
                  value={selectedRowForModal.cableOriginDestination}
                  onChange={e => updatePhysicalSignalMappingAction(selectedRowForModal.decklinkChannelId, { cableOriginDestination: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#070a12', border: '1px solid #334155', color: '#ffffff', padding: '8px 10px', borderRadius: '4px' }}
                />
              </div>

              {/* Capa 2: Conector Físico Real */}
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>
                  2. POSICIÓN DEL CONECTOR FÍSICO REAL (Tarjeta DeckLink):
                </label>
                <input
                  type="text"
                  value={selectedRowForModal.physicalConnectorPosition}
                  onChange={e => updatePhysicalSignalMappingAction(selectedRowForModal.decklinkChannelId, { physicalConnectorPosition: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#070a12', border: '1px solid #334155', color: '#ffffff', padding: '8px 10px', borderRadius: '4px' }}
                />
              </div>

              {/* Capa 3: Identificador Desktop Video */}
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>
                  3. IDENTIFICADOR DESKTOP VIDEO (Blackmagic Driver):
                </label>
                <input
                  type="text"
                  value={selectedRowForModal.desktopVideoLabel}
                  onChange={e => updatePhysicalSignalMappingAction(selectedRowForModal.decklinkChannelId, { desktopVideoLabel: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#070a12', border: '1px solid #334155', color: '#ffffff', padding: '8px 10px', borderRadius: '4px' }}
                />
              </div>

              {/* Capa 4: Destino Físico ATEM */}
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>
                  4. DESTINO FÍSICO EN ATEM SWITCHER:
                </label>
                <input
                  type="text"
                  value={selectedRowForModal.atemInputLabel}
                  onChange={e => updatePhysicalSignalMappingAction(selectedRowForModal.decklinkChannelId, { atemInputLabel: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#070a12', border: '1px solid #334155', color: '#ffffff', padding: '8px 10px', borderRadius: '4px' }}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={() => setSelectedSignalChannelId(null)}
                style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: '#ffffff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
              >
                CERRAR Y GUARDAR EN PERFIL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
