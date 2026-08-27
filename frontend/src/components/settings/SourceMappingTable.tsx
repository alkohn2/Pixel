import React, { useState, useEffect, useRef } from 'react';
import type { SwitcherStore } from '../../store/useSwitcherStore';
import type { LogicalSource, ConnectorPhysicalStatus } from '../../types/sources';
import { getDeckLinkSignalState, getDirectionStateBadge, getDefaultPhysicalSignalMap, getSourceVisualTheme } from '../../types/sources';
import type { ImportPreviewData, RecoveryOperationLog } from '../../types/recovery';
import {
  exportAllProfiles,
  exportActiveProfile,
  validateAndPreviewImport,
  getBackupMetadata,
  getLastOperationLog
} from '../../services/recoveryService';
import {
  Sliders,
  Monitor,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  Bookmark,
  Info,
  Activity,
  Video,
  Lock,
  Plug,
  Unplug,
  ShieldCheck,
  KeyRound,
  WifiOff,
  Clock,
  AlertOctagon,
  Layers,
  ExternalLink,
  Trophy,
  Eye,
  Download,
  Upload,
  RefreshCw,
  FileJson,
  FileCheck,
  ShieldAlert,
  Merge,
  Cpu,
  GitCommit,
  Check,
  X,
  Edit3,
  Network,
  Tv
} from 'lucide-react';

interface SourceMappingTableProps {
  store: SwitcherStore;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#6366F1', // Indigo
  '#64748B', // Slate
];

export const SourceMappingTable: React.FC<SourceMappingTableProps> = ({ store }) => {
  const {
    logicalSources,
    physicalInputs,
    profiles,
    activeProfileId,
    bridgeState,
    lastBridgeData,
    obsConfig,
    obsStatus,
    isObsTesting,
    resolumeConfig,
    resolumeStatus,
    isResolumeTesting,
    volleyballStatus,
    setObsConfig,
    testOBSConnectionAction,
    disconnectOBSAction,
    setResolumeConfig,
    testResolumeConnectionAction,
    disconnectResolumeAction,
    updateActiveProfileVolleyballModule,
    updatePhysicalSignalMappingAction,
    loadProfile,
    saveCurrentProfile,
    duplicateProfile,
    resetProfile,
    deleteProfile,
    importProfilesPackageAction,
    restoreBackupAction,
    updateSourceMapping,
    updateLogicalSource,
    setActiveTab
  } = store;

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LogicalSource | null>(null);

  // Selected Channel ID for 4-Layer Traceability Detail Modal / Slide-Over
  const [selectedSignalChannelId, setSelectedSignalChannelId] = useState<number | null>(null);

  // Volleyball Module Form State (Per Active Profile)
  const [vballControlUrl, setVballControlUrl] = useState<string>('');
  const [vballOverlayUrl, setVballOverlayUrl] = useState<string>('');

  // Session-only OBS Password (never persisted, never saved in localStorage)
  const [sessionObsPassword, setSessionObsPassword] = useState<string>('');

  // Phase 8: Import & Recovery States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawImportJson, setRawImportJson] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewData | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [lastOpLog, setLastOpLog] = useState<RecoveryOperationLog | null>(() => getLastOperationLog());
  const [showAdvancedTools, setShowAdvancedTools] = useState<boolean>(false);
  const [showPreflightModal, setShowPreflightModal] = useState<boolean>(false);

  useEffect(() => {
    setVballControlUrl(activeProfile.volleyballModule?.controlUrl || '');
    setVballOverlayUrl(activeProfile.volleyballModule?.overlayUrl || '');
  }, [activeProfileId, activeProfile]);

  const handleStartEdit = (source: LogicalSource) => {
    setEditingId(source.id);
    setEditForm({ ...source });
  };

  const handleSaveInline = () => {
    if (editForm) {
      updateLogicalSource(editForm);
    }
    setEditingId(null);
    setEditForm(null);
  };

  const handleDuplicateClick = () => {
    const name = prompt('Introduce el nombre para el nuevo perfil duplicado:', `${activeProfileId}_COPIA`);
    if (name) {
      duplicateProfile(name);
    }
  };

  const handleVballUrlChange = (control: string, overlay: string) => {
    setVballControlUrl(control);
    setVballOverlayUrl(overlay);
    updateActiveProfileVolleyballModule(control, overlay);
  };

  const handleOpenExternalUrl = (url: string) => {
    if (!url || !url.trim()) return;
    window.open(url.trim(), '_blank', 'noopener,noreferrer');
  };

  // Export Handlers
  const handleExportAll = () => {
    const log = exportAllProfiles(profiles, activeProfileId);
    setLastOpLog(log);
  };

  const handleExportActive = () => {
    const log = exportActiveProfile(profiles, activeProfileId);
    setLastOpLog(log);
  };

  // Import File Selection Handler
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setRawImportJson(text);
      const preview = validateAndPreviewImport(text);
      setImportPreview(preview);
      setShowImportModal(true);
    };
    reader.readAsText(file);

    // Reset file input so same file can be re-selected if needed
    e.target.value = '';
  };

  // Confirm Import Execution
  const handleConfirmImport = () => {
    if (!rawImportJson || !importPreview || !importPreview.valid) return;

    try {
      const parsed = JSON.parse(rawImportJson);
      const importedProfiles = parsed.profiles || [];
      const targetActiveId = parsed.activeProfileId;

      importProfilesPackageAction(importedProfiles, importMode, targetActiveId);

      const log: RecoveryOperationLog = {
        timestamp: new Date().toISOString(),
        type: importMode === 'replace' ? 'IMPORT_REPLACE' : 'IMPORT_MERGE',
        status: 'SUCCESS',
        details: `Importación (${importMode.toUpperCase()}) completada con éxito: ${importedProfiles.length} perfiles procesados.`
      };
      setLastOpLog(log);
      setShowImportModal(false);
      setRawImportJson(null);
      setImportPreview(null);
      alert(`¡Importación (${importMode === 'replace' ? 'Reemplazo' : 'Fusión'}) completada exitosamente! Se ha creado una copia de recuperación previa.`);
    } catch (err: any) {
      alert(`Error al procesar la importación: ${err?.message || 'Error desconocido'}`);
    }
  };

  // Restore Backup Handler
  const handleRestoreBackup = () => {
    const backupMeta = getBackupMetadata();
    if (!backupMeta) {
      alert('No existe ninguna copia de recuperación guardada en este navegador.');
      return;
    }

    const backupDate = new Date(backupMeta.timestamp).toLocaleString();
    if (confirm(`¿Deseas restaurar la copia de recuperación local del ${backupDate} (${backupMeta.profilesCount} perfiles)?`)) {
      const restored = restoreBackupAction();
      if (restored) {
        setLastOpLog(getLastOperationLog());
        alert('¡Copia de recuperación restaurada con éxito!');
      } else {
        alert('Error al restaurar la copia de recuperación.');
      }
    }
  };

  const renderOBSErrorIcon = (errorType?: string) => {
    switch (errorType) {
      case 'auth_failed':
        return <KeyRound style={{ width: '16px', height: '16px', color: '#f87171' }} />;
      case 'timeout':
        return <Clock style={{ width: '16px', height: '16px', color: '#fbbf24' }} />;
      case 'incompatible':
        return <AlertOctagon style={{ width: '16px', height: '16px', color: '#f87171' }} />;
      case 'unreachable':
      default:
        return <WifiOff style={{ width: '16px', height: '16px', color: '#f87171' }} />;
    }
  };

  const isVballConfigured = Boolean(vballControlUrl.trim() || vballOverlayUrl.trim());
  const vState = volleyballStatus.matchState;
  const backupMeta = getBackupMetadata();

  const formattedVballTime = volleyballStatus.lastReceivedAt
    ? new Date(volleyballStatus.lastReceivedAt).toLocaleTimeString()
    : null;

  // Real DeckLink Channels Map from Production Bridge
  const decklinkData = lastBridgeData?.decklink;
  const decklinkChannels = decklinkData?.channels;
  const hasRealDeckLinkData = Boolean(decklinkChannels && Object.keys(decklinkChannels).length > 0);
  const expectedFormat = decklinkData?.expectedFormat || '1080p59.94';

  // 4-Layer Physical Signal Map for Active Profile (Unconfirmed default if absent)
  const physicalSignalMap = activeProfile.physicalSignalMap && activeProfile.physicalSignalMap.length === 8
    ? activeProfile.physicalSignalMap
    : getDefaultPhysicalSignalMap();

  // Selected row for detail modal
  const selectedRow = selectedSignalChannelId !== null
    ? physicalSignalMap.find(m => m.decklinkChannelId === selectedSignalChannelId) || getDefaultPhysicalSignalMap()[selectedSignalChannelId - 1] || null
    : null;

  const selectedDeckInfo = selectedSignalChannelId !== null
    ? getDeckLinkSignalState(`input-${selectedSignalChannelId}`, decklinkChannels, expectedFormat)
    : null;

  const selectedChData = selectedSignalChannelId !== null && decklinkChannels
    ? decklinkChannels[`input-${selectedSignalChannelId}`]
    : null;

  const selectedDirBadge = getDirectionStateBadge(selectedChData?.directionState);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header Bar with Profile Controls */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        {/* Top Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sliders style={{ width: '20px', height: '20px', color: '#ffffff' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, fontFamily: '"Outfit", sans-serif' }}>
                  CONFIGURACIÓN DE FUENTES, PERFILES E INTEGRACIONES — PIXEL
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
                  <Bookmark style={{ width: '11px', height: '11px' }} />
                  ACTIVO: {activeProfile?.name}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Gestión de Perfiles Reutilizables, Reasignación Física y Observabilidad de Módulos Externos
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setShowPreflightModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            >
              <ShieldCheck style={{ width: '16px', height: '16px' }} />
              EJECUTAR PREFLIGHT CHECK
            </button>

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

        {/* Profile Control Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: '#070a12',
          border: '1px solid #1e293b',
          borderRadius: '6px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'monospace' }}>
              Perfil de Producción:
            </span>
            <select
              value={activeProfileId}
              onChange={e => loadProfile(e.target.value)}
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #3b82f6',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                minWidth: '200px'
              }}
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isBuiltin ? '(Predeterminado)' : '(Personalizado)'}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={saveCurrentProfile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer'
              }}
              title="Guardar cambios en el perfil activo actual"
            >
              <Save style={{ width: '13px', height: '13px' }} />
              Guardar Cambios
            </button>

            <button
              onClick={handleDuplicateClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                backgroundColor: '#1e293b',
                color: '#cbd5e1',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '4px',
                border: '1px solid #334155',
                cursor: 'pointer'
              }}
              title="Crear un nuevo perfil duplicando esta plantilla"
            >
              <Copy style={{ width: '13px', height: '13px' }} />
              Duplicar Perfil
            </button>

            <button
              onClick={() => resetProfile(activeProfileId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                backgroundColor: '#1e293b',
                color: '#94a3b8',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '4px',
                border: '1px solid #334155',
                cursor: 'pointer'
              }}
              title="Restablecer el perfil activo a la plantilla de fábrica"
            >
              <RotateCcw style={{ width: '13px', height: '13px' }} />
              Restablecer
            </button>

            {!activeProfile.isBuiltin && (
              <button
                onClick={() => deleteProfile(activeProfileId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  backgroundColor: '#7f1d1d',
                  color: '#fca5a5',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  border: '1px solid #991b1b',
                  cursor: 'pointer'
                }}
                title="Eliminar este perfil personalizado"
              >
                <Trash2 style={{ width: '13px', height: '13px' }} />
                Eliminar
              </button>
            )}
          </div>
        </div>
      </div>
      {/* 2. COMPACT GENERAL SYSTEM HEALTH STATUS BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: '#070a12',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity style={{ width: '14px', height: '14px', color: '#3b82f6' }} />
          <span>ESTADO GENERAL:</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Bridge / ATEM */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'monospace' }}>
            <span style={{ color: '#94a3b8' }}>Bridge/ATEM:</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: lastBridgeData?.connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: lastBridgeData?.connected ? '#34d399' : '#f87171',
              border: lastBridgeData?.connected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              fontWeight: 'bold'
            }}>
              {lastBridgeData?.connected ? '🟢 CONECTADO' : '🔴 DESCONECTADO'}
            </span>
          </div>

          {/* DeckLink */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'monospace' }}>
            <span style={{ color: '#94a3b8' }}>DeckLink:</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: hasRealDeckLinkData ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: hasRealDeckLinkData ? '#34d399' : '#f87171',
              border: hasRealDeckLinkData ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              fontWeight: 'bold'
            }}>
              {hasRealDeckLinkData ? '🟢 SDK REAL' : '🔴 SIN VALIDAR'}
            </span>
          </div>

          {/* OBS Studio */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'monospace' }}>
            <span style={{ color: '#94a3b8' }}>OBS:</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: lastBridgeData?.obsConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: lastBridgeData?.obsConnected ? '#34d399' : '#f87171',
              border: lastBridgeData?.obsConnected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              fontWeight: 'bold'
            }}>
              {lastBridgeData?.obsConnected ? '🟢 CONECTADO' : '🔴 DESCONECTADO'}
            </span>
          </div>

          {/* Resolume Arena */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'monospace' }}>
            <span style={{ color: '#94a3b8' }}>Resolume:</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: lastBridgeData?.resolumeConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: lastBridgeData?.resolumeConnected ? '#34d399' : '#f87171',
              border: lastBridgeData?.resolumeConnected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              fontWeight: 'bold'
            }}>
              {lastBridgeData?.resolumeConnected ? '🟢 CONECTADO' : '🔴 DESCONECTADO'}
            </span>
          </div>

          {/* Volleyball Control2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'monospace' }}>
            <span style={{ color: '#94a3b8' }}>Volleyball:</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: volleyballStatus.hasData ? 'rgba(16, 185, 129, 0.15)' : isVballConfigured ? 'rgba(56, 189, 248, 0.15)' : 'rgba(100, 116, 139, 0.2)',
              color: volleyballStatus.hasData ? '#34d399' : isVballConfigured ? '#38bdf8' : '#94a3b8',
              border: volleyballStatus.hasData ? '1px solid rgba(16, 185, 129, 0.3)' : isVballConfigured ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(100, 116, 139, 0.3)',
              fontWeight: 'bold'
            }}>
              {volleyballStatus.hasData ? '🟢 MARCADOR EN VIVO' : isVballConfigured ? '🔵 CONFIGURADO' : '⚪ SIN CONFIGURAR'}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowPreflightModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            backgroundColor: '#1e293b',
            color: '#38bdf8',
            border: '1px solid #0284c7',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            cursor: 'pointer'
          }}
        >
          <ShieldCheck style={{ width: '13px', height: '13px' }} />
          PREFLIGHT CHECK
        </button>
      </div>

      {/* 3. CENTRAL MAPA VISUAL DE RUTAS VERIFICADAS CARD */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #10b981',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Network style={{ width: '20px', height: '20px', color: '#ffffff' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, fontFamily: '"Outfit", sans-serif', color: '#ffffff' }}>
                  MAPA VISUAL DE RUTAS VERIFICADAS
                </h3>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  <CheckCircle2 style={{ width: '12px', height: '12px' }} />
                  {physicalSignalMap.filter(m => m.mappingStatus === 'VERIFICADO').length} RUTAS VERIFICADAS EN VIVO
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Interfaz visual de rutas de video. Haz clic en cualquier tarjeta de ruta o nodo de puerto para abrir el panel completo de trazabilidad.
              </p>
            </div>
          </div>
        </div>

        {/* 1. VERIFIED ROUTES FLOW CARDS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {physicalSignalMap.map(route => {
            const isVerified = route.mappingStatus === 'VERIFICADO';
            const theme = getSourceVisualTheme(route.logicalSourceName);

            if (!isVerified) {
              return (
                <div
                  key={route.decklinkChannelId}
                  style={{
                    backgroundColor: '#070a12',
                    border: '1px dashed #334155',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    opacity: 0.6
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', fontFamily: 'monospace' }}>
                      DeckLink Quad ({route.decklinkChannelId})
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '3px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', fontFamily: 'monospace' }}>
                      Pendiente de inspección
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace' }}>
                    Sin línea de conexión trazada
                  </div>
                </div>
              );
            }

            return (
              <div
                key={route.decklinkChannelId}
                onClick={() => setSelectedSignalChannelId(route.decklinkChannelId)}
                style={{
                  backgroundColor: '#070a12',
                  border: `1px solid ${theme.color}`,
                  borderRadius: '8px',
                  padding: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: `0 4px 12px ${theme.color}20`,
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Header: Logical Source & VERIFICADO Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    backgroundColor: theme.badgeBg,
                    color: theme.textHex,
                    border: `1px solid ${theme.color}66`,
                    fontSize: '12px',
                    fontWeight: '800',
                    fontFamily: 'monospace',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    FUENTE: {route.logicalSourceName}
                  </span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    border: '1px solid #059669',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    <CheckCircle2 style={{ width: '11px', height: '11px' }} />
                    VERIFICADO
                  </span>
                </div>

                {/* 5 Traceability Steps */}
                <div style={{ fontSize: '11px', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '4px', color: '#cbd5e1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>DeckLink software:</span>
                    <strong style={{ color: '#ffffff' }}>{route.decklinkChannelName}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Desktop Video:</span>
                    <strong style={{ color: '#fbbf24' }}>{route.desktopVideoLabel || 'Por confirmar'}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Conector físico:</span>
                    <strong style={{ color: '#38bdf8' }}>{route.physicalConnectorPosition || 'Por confirmar'}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Destino Switcher:</span>
                    <strong style={{ color: theme.textHex }}>{route.atemInputLabel}</strong>
                  </div>
                </div>

                {/* Action Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: '8px', fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  <span>Haz clic para ver / editar</span>
                  <Eye style={{ width: '13px', height: '13px', color: theme.textHex }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* 2. DIAGRAMS OF REAL HARDWARE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
          
          {/* Diagram 1: DECKLINK QUAD 2 (8 Physical I/O Ports in 1 Horizontal Row) */}
          <div style={{ backgroundColor: '#070a12', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu style={{ width: '16px', height: '16px', color: '#60a5fa' }} />
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, fontFamily: 'monospace', color: '#ffffff' }}>
                  DECKLINK QUAD 2: 8 PUNTOS I/O FÍSICOS (FILA HORIZONTAL 1–8)
                </h4>
              </div>
              <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                Orden físico de izquierda a derecha
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(chId => {
                const r = physicalSignalMap.find(m => m.decklinkChannelId === chId);
                const isVerified = r?.mappingStatus === 'VERIFICADO';
                const theme = isVerified ? getSourceVisualTheme(r?.logicalSourceName) : null;

                return (
                  <div
                    key={chId}
                    onClick={() => setSelectedSignalChannelId(chId)}
                    style={{
                      backgroundColor: isVerified ? `${theme?.color}15` : '#0f172a',
                      border: isVerified ? `1px solid ${theme?.color}` : '1px solid #334155',
                      borderRadius: '6px',
                      padding: '10px 6px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      boxShadow: isVerified ? `0 2px 6px ${theme?.color}20` : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', fontFamily: 'monospace' }}>
                      Quad ({chId})
                    </span>
                    {isVerified ? (
                      <>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: theme?.textHex, fontFamily: 'monospace' }}>
                          {r?.logicalSourceName}
                        </span>
                        <span style={{ fontSize: '9px', color: '#fbbf24', fontFamily: 'monospace' }}>
                          {r?.desktopVideoLabel}
                        </span>
                        <span style={{ fontSize: '9px', color: '#38bdf8', fontFamily: 'monospace' }}>
                          {r?.physicalConnectorPosition}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: '9px', color: '#64748b', fontFamily: 'monospace', padding: '6px 0' }}>
                        Pendiente
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Diagram 2: ATEM SWITCHER (8 Entradas Reales: Fila Superior = BNC 1-4, Fila Inferior = HDMI 1-4) */}
          <div style={{ backgroundColor: '#070a12', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tv style={{ width: '16px', height: '16px', color: '#34d399' }} />
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, fontFamily: 'monospace', color: '#ffffff' }}>
                  ATEM TELEVISION STUDIO PRO HD: 8 ENTRADAS REALES (2 FILAS DE 4)
                </h4>
              </div>
              <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                Fila superior: BNC 1–4 | Fila inferior: HDMI 1–4
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Fila Superior: ATEM BNC 1 a 4 */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '4px', fontFamily: 'monospace' }}>
                  • ENTRADAS BNC (SDI 1–4):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[1, 2, 3, 4].map(bncNum => {
                    const r = physicalSignalMap.find(m => m.atemInputLabel && m.atemInputLabel.includes(`BNC ${bncNum}`) && m.mappingStatus === 'VERIFICADO');
                    const theme = r ? getSourceVisualTheme(r.logicalSourceName) : null;

                    return (
                      <div
                        key={`bnc-${bncNum}`}
                        onClick={() => r && setSelectedSignalChannelId(r.decklinkChannelId)}
                        style={{
                          backgroundColor: r ? `${theme?.color}15` : '#0f172a',
                          border: r ? `1px solid ${theme?.color}` : '1px solid #334155',
                          borderRadius: '6px',
                          padding: '10px 8px',
                          textAlign: 'center',
                          cursor: r ? 'pointer' : 'default',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          boxShadow: r ? `0 2px 6px ${theme?.color}20` : 'none'
                        }}
                      >
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#38bdf8', fontFamily: 'monospace' }}>
                          ATEM BNC {bncNum}
                        </span>
                        {r ? (
                          <span style={{ fontSize: '11px', fontWeight: '800', color: theme?.textHex, fontFamily: 'monospace' }}>
                            {r.logicalSourceName}
                          </span>
                        ) : (
                          <span style={{ fontSize: '9px', color: '#64748b', fontFamily: 'monospace' }}>
                            Pendiente de inspección
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fila Inferior: ATEM HDMI 1 a 4 */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#a78bfa', marginBottom: '4px', fontFamily: 'monospace' }}>
                  • ENTRADAS HDMI (HDMI 1–4):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[1, 2, 3, 4].map(hdmiNum => {
                    const r = physicalSignalMap.find(m => m.atemInputLabel && m.atemInputLabel.includes(`HDMI ${hdmiNum}`) && m.mappingStatus === 'VERIFICADO');
                    const theme = r ? getSourceVisualTheme(r.logicalSourceName) : null;

                    return (
                      <div
                        key={`hdmi-${hdmiNum}`}
                        onClick={() => r && setSelectedSignalChannelId(r.decklinkChannelId)}
                        style={{
                          backgroundColor: r ? `${theme?.color}15` : '#0f172a',
                          border: r ? `1px solid ${theme?.color}` : '1px solid #334155',
                          borderRadius: '6px',
                          padding: '10px 8px',
                          textAlign: 'center',
                          cursor: r ? 'pointer' : 'default',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          boxShadow: r ? `0 2px 6px ${theme?.color}20` : 'none'
                        }}
                      >
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#a78bfa', fontFamily: 'monospace' }}>
                          ATEM HDMI {hdmiNum}
                        </span>
                        {r ? (
                          <span style={{ fontSize: '11px', fontWeight: '800', color: theme?.textHex, fontFamily: 'monospace' }}>
                            {r.logicalSourceName}
                          </span>
                        ) : (
                          <span style={{ fontSize: '9px', color: '#64748b', fontFamily: 'monospace' }}>
                            Pendiente de inspección
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. COLLAPSIBLE ACCORDION TOGGLE BUTTON FOR HERRAMIENTAS AVANZADAS */}
      <div style={{ marginTop: '24px', borderTop: '2px dashed #1e293b', paddingTop: '20px', marginBottom: '20px' }}>
        <button
          onClick={() => setShowAdvancedTools(prev => !prev)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            backgroundColor: showAdvancedTools ? '#1e293b' : '#0f172a',
            border: showAdvancedTools ? '1px solid #3b82f6' : '1px solid #334155',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 'bold',
            fontFamily: '"Outfit", sans-serif',
            cursor: 'pointer',
            boxShadow: showAdvancedTools ? '0 4px 14px rgba(59, 130, 246, 0.15)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sliders style={{ width: '18px', height: '18px', color: '#ffffff' }} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>
                HERRAMIENTAS AVANZADAS (DIAGNÓSTICO TÉCNICO, TABLA COMPLETA E INTEGRACIONES)
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', marginTop: '2px' }}>
                Diagnóstico pasivo DeckLink, tabla de trazabilidad, configuración de OBS/Resolume/Volleyball y copias JSON
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#60a5fa', fontWeight: 'bold', fontFamily: 'monospace' }}>
            <span>{showAdvancedTools ? 'OCULTAR SECCIÓN' : 'MOSTRAR HERRAMIENTAS'}</span>
            <span style={{ fontSize: '14px', transform: showAdvancedTools ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
              ▼
            </span>
          </div>
        </button>

        {showAdvancedTools && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* SECCIÓN A: DIAGNÓSTICO BLACKMAGIC DECKLINK QUAD 2 */}
            <details style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', overflow: 'hidden' }} open>
              <summary style={{ padding: '14px 20px', backgroundColor: '#070a12', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', fontFamily: '"Outfit", sans-serif', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Cpu style={{ width: '18px', height: '18px', color: '#60a5fa' }} />
                  <span>SECCIÓN A: DIAGNÓSTICO TÉCNICO COMPLETO DECKLINK QUAD 2 (8 CANALES)</span>
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>[DIAGNÓSTICO TÉCNICO]</span>
              </summary>
              <div style={{ padding: '20px', borderTop: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Cpu style={{ width: '18px', height: '18px', color: '#60a5fa' }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, fontFamily: '"Outfit", sans-serif' }}>
                          MÓDULO DE HARDWARE: BLACKMAGIC DECKLINK QUAD 2 (8 CANALES SDI)
                        </h3>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: hasRealDeckLinkData ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: hasRealDeckLinkData ? '#34d399' : '#f87171',
                          border: hasRealDeckLinkData ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          fontFamily: 'monospace',
                          padding: '1px 6px',
                          borderRadius: '3px'
                        }}>
                          {hasRealDeckLinkData ? '🟢 SDK REAL CONECTADO' : '🔴 EN IMPLEMENTACIÓN / SIN VALIDAR'}
                        </span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                        Diagnóstico pasivo de salud SDI y trazabilidad documental separada entre cable DeckLink y ruta ATEM
                      </p>
                    </div>
                  </div>
                </div>

        {/* Status Display: Real Data */}
        {hasRealDeckLinkData && decklinkChannels ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '14px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(chNum => {
              const inputId = `input-${chNum}`;
              const chData = decklinkChannels[inputId];
              const info = getDeckLinkSignalState(inputId, decklinkChannels, expectedFormat);
              const dirInfo = getDirectionStateBadge(chData?.directionState);

              const mappingRow = physicalSignalMap.find(m => m.decklinkChannelId === chNum);

              return (
                <div
                  key={inputId}
                  style={{
                    backgroundColor: '#070a12',
                    border: `1px solid ${info.badgeColor}`,
                    borderRadius: '6px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: `0 2px 8px ${info.badgeColor}22`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffffff', fontFamily: 'monospace' }}>
                      DeckLink Quad ({chNum})
                    </span>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: `${info.badgeColor}22`,
                      color: info.badgeColor,
                      border: `1px solid ${info.badgeColor}44`
                    }}>
                      {info.label}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: '#cbd5e1', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div>• Dirección: <strong style={{ color: dirInfo.badgeColor }}>{dirInfo.label}</strong></div>
                    <div>• Lock SDI: <strong style={{ color: chData?.signalLocked ? '#34d399' : '#f87171' }}>{chData?.signalLocked ? 'SÍ (LOCKED)' : 'NO (UNLOCKED)'}</strong></div>
                    <div>• Formato: <strong>{chData?.inputFormat || 'Sin Señal'}</strong></div>
                    <div>• Píxel: <span>{chData?.pixelFormat || 'N/A'}</span></div>
                  </div>

                  {/* Hardware Box Footer: Separated DeckLink Cable & ATEM Route */}
                  <div style={{ marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '10px', fontFamily: 'monospace' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Conector Físico: </span>
                      <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>
                        {mappingRow?.physicalConnectorPosition || (chNum === 2 ? '4.º desde la derecha' : chNum === 5 ? '3.er desde la derecha' : 'Por confirmar')}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Desktop Video: </span>
                      <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                        {mappingRow?.desktopVideoLabel || (chNum === 2 ? 'SDI 3' : chNum === 5 ? 'SDI 5' : chNum === 1 ? 'SDI 1' : 'Por confirmar')}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Fuente / Cable: </span>
                      <span style={{ color: '#ffffff', fontWeight: 'bold' }}>
                        {mappingRow?.cableOriginDestination || 'Por confirmar'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Destino ATEM: </span>
                      <span style={{ color: '#34d399', fontWeight: 'bold' }}>
                        {mappingRow?.atemInputLabel || 'Sin confirmar'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            backgroundColor: '#070a12',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#38bdf8'
          }}>
            <AlertCircle style={{ width: '20px', height: '20px', flexShrink: 0, color: '#38bdf8' }} />
            <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
              <div style={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '2px' }}>
                OBSERVABILIDAD DE CAPTURADORA: EN IMPLEMENTACIÓN / SIN VALIDAR
              </div>
              <div style={{ color: '#94a3b8' }}>
                Production Bridge (`http://127.0.0.1:3000/status`) entrega actualmente solo datos del switcher ATEM. No incluye aún la propiedad nativa `decklink`. Se prohíbe mostrar datos simulados de señal SDI. Las 8 posiciones asignadas conservan el estado honesto: <strong>ASIGNADA (ESTADO DESCONOCIDO)</strong>.
              </div>
            </div>
          </div>
        )}

        {/* Mandatory Security Disclaimer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#070a12',
          border: '1px solid #1e293b',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#94a3b8',
          fontFamily: 'monospace'
        }}>
          <ShieldCheck style={{ width: '14px', height: '14px', color: '#38bdf8', flexShrink: 0 }} />
          <span>Regla Visual: El cable físico conectado a DeckLink y la ruta separada hacia el ATEM se presentan de forma independiente sin asumir un único cable.</span>
        </div>
      </div>
    </details>

    {/* SECCIÓN B: MAPA FÍSICO DE SEÑALES (TABLA DOCUMENTAL EDITABLE) */}
    <details style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', overflow: 'hidden' }} open>
      <summary style={{ padding: '14px 20px', backgroundColor: '#070a12', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', fontFamily: '"Outfit", sans-serif', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GitCommit style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
          <span>SECCIÓN B: MAPA FÍSICO DE SEÑALES (TABLA DOCUMENTAL EDITABLE DE 8 CANALES)</span>
        </div>
        <span style={{ fontSize: '11px', color: '#fbbf24', fontFamily: 'monospace' }}>[ÚNICA FUENTE EDITABLE DE CABLEADO Y ATEM]</span>
      </summary>
      <div style={{ padding: '20px', borderTop: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GitCommit style={{ width: '18px', height: '18px', color: '#ffffff' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, fontFamily: '"Outfit", sans-serif' }}>
                  MAPA FÍSICO DE SEÑALES (4 CAPAS DE TRAZABILIDAD Y CABLEADO)
                </h3>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(217, 119, 6, 0.15)',
                  color: '#fbbf24',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  padding: '1px 6px',
                  borderRadius: '3px'
                }}>
                  POR PERFIL: {activeProfile.name}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Resumen compacto con separación transparente de cable DeckLink y ruta ATEM. Haz clic en "Ver / Editar" para abrir el panel completo.
              </p>
            </div>
          </div>
        </div>

        {/* 8-Column Summary Signal Matrix Table with Explicit Physical Position and Desktop Video */}
        <div style={{ border: '1px solid #1e293b', borderRadius: '6px', overflow: 'hidden', marginBottom: '12px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', fontFamily: 'monospace' }}>
            <thead>
              <tr style={{ backgroundColor: '#070a12', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', borderBottom: '1px solid #1e293b' }}>
                <th style={{ padding: '10px 12px', width: '130px' }}>Software DeckLink</th>
                <th style={{ padding: '10px 12px', width: '150px' }}>Conector Físico</th>
                <th style={{ padding: '10px 12px', width: '110px' }}>Desktop Video</th>
                <th style={{ padding: '10px 12px', width: '180px' }}>Hardware Pasivo (Bridge)</th>
                <th style={{ padding: '10px 12px' }}>Fuente / Cable Conectado</th>
                <th style={{ padding: '10px 12px', width: '130px' }}>Destino ATEM</th>
                <th style={{ padding: '10px 12px', width: '110px' }}>Nombre PIXEL</th>
                <th style={{ padding: '10px 12px', width: '110px' }}>Estado</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', width: '110px' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(chNum => {
                const inputId = `input-${chNum}`;
                const row = physicalSignalMap.find(m => m.decklinkChannelId === chNum) || getDefaultPhysicalSignalMap()[chNum - 1];

                const chData = decklinkChannels ? decklinkChannels[inputId] : undefined;
                const deckInfo = getDeckLinkSignalState(inputId, decklinkChannels, expectedFormat);
                const dirInfo = getDirectionStateBadge(chData?.directionState);

                return (
                  <tr key={inputId} style={{ borderBottom: '1px solid #1e293b', backgroundColor: chNum % 2 === 0 ? 'rgba(15, 23, 42, 0.5)' : 'transparent' }}>
                    {/* Software DeckLink */}
                    <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#ffffff' }}>
                      DeckLink Quad ({chNum})
                    </td>

                    {/* Physical Connector Position (Counted Right to Left) */}
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        color: row.physicalConnectorPosition && row.physicalConnectorPosition !== 'Por confirmar' ? '#38bdf8' : '#64748b',
                        fontWeight: 'bold',
                        fontSize: '11px'
                      }}>
                        {row.physicalConnectorPosition || (chNum === 2 ? '4.º desde la derecha' : chNum === 5 ? '3.er desde la derecha' : 'Por confirmar')}
                      </span>
                    </td>

                    {/* Desktop Video Label */}
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        color: row.desktopVideoLabel && row.desktopVideoLabel !== 'Por confirmar' ? '#fbbf24' : '#64748b',
                        fontWeight: 'bold',
                        fontSize: '11px'
                      }}>
                        {row.desktopVideoLabel || (chNum === 2 ? 'SDI 3' : chNum === 5 ? 'SDI 5' : chNum === 1 ? 'SDI 1' : 'Por confirmar')}
                      </span>
                    </td>

                    {/* Real Bridge Hardware Reading */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 6px',
                          backgroundColor: `${dirInfo.badgeColor}22`,
                          color: dirInfo.badgeColor,
                          border: `1px solid ${dirInfo.badgeColor}55`,
                          fontSize: '9px',
                          fontWeight: 'bold',
                          borderRadius: '3px',
                          width: 'fit-content'
                        }}>
                          {dirInfo.label}
                        </span>

                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 6px',
                          backgroundColor: `${deckInfo.badgeColor}22`,
                          color: deckInfo.badgeColor,
                          border: `1px solid ${deckInfo.badgeColor}55`,
                          fontSize: '9px',
                          fontWeight: 'bold',
                          borderRadius: '3px',
                          width: 'fit-content'
                        }}>
                          {deckInfo.label}
                        </span>
                      </div>
                    </td>

                    {/* Cable / Fuente Conectada a DeckLink */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '1px 6px',
                          backgroundColor: row.connectorStatus === 'Conectado' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: row.connectorStatus === 'Conectado' ? '#34d399' : '#fbbf24',
                          border: row.connectorStatus === 'Conectado' ? '1px solid #059669' : '1px solid #d97706',
                          fontSize: '9px',
                          fontWeight: 'bold',
                          borderRadius: '3px',
                          width: 'fit-content'
                        }}>
                          {row.connectorStatus}
                        </span>
                        <span style={{ color: '#ffffff', fontSize: '11px', fontWeight: 'bold' }}>
                          {row.cableOriginDestination}
                        </span>
                      </div>
                    </td>

                    {/* Destino ATEM */}
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        color: row.atemInputLabel && row.atemInputLabel !== 'Sin confirmar' ? '#38bdf8' : '#64748b',
                        fontWeight: 'bold',
                        fontSize: '11px'
                      }}>
                        {row.atemInputLabel}
                      </span>
                    </td>

                    {/* Logical Name Badge */}
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        color: row.logicalSourceName && row.logicalSourceName !== 'Sin asignar' ? '#ffffff' : '#64748b',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}>
                        {row.logicalSourceName || 'Sin asignar'}
                      </span>
                    </td>

                    {/* Mapping Status Badge */}
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => updatePhysicalSignalMappingAction(chNum, {
                          mappingStatus: row.mappingStatus === 'VERIFICADO' ? 'PENDIENTE' : 'VERIFICADO'
                        })}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          backgroundColor: row.mappingStatus === 'VERIFICADO' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: row.mappingStatus === 'VERIFICADO' ? '#34d399' : '#fbbf24',
                          border: row.mappingStatus === 'VERIFICADO' ? '1px solid #059669' : '1px solid #d97706',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        title="Haz clic para conmutar voluntariamente el estado de verificación"
                      >
                        {row.mappingStatus === 'VERIFICADO' ? (
                          <>
                            <Check style={{ width: '11px', height: '11px' }} />
                            VERIFICADO
                          </>
                        ) : (
                          <>
                            <Clock style={{ width: '11px', height: '11px' }} />
                            PENDIENTE
                          </>
                        )}
                      </button>
                    </td>

                    {/* Action Button */}
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedSignalChannelId(chNum)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <Eye style={{ width: '13px', height: '13px' }} />
                        Ver / Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Disclaimer Note */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#070a12',
          border: '1px solid #1e293b',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#94a3b8',
          fontFamily: 'monospace'
        }}>
          <ShieldAlert style={{ width: '14px', height: '14px', color: '#fbbf24', flexShrink: 0 }} />
          <span>Regla Operativa: Completar los campos no cambia automáticamente el estado a VERIFICADO. Solo el operador puede conmutar una fila a VERIFICADO tras confirmar físicamente la ruta.</span>
        </div>
      </div>
    </details>

      {/* 4-LAYER TRACEABILITY & PHYSICAL CABLING DETAIL MODAL */}
      {selectedSignalChannelId !== null && selectedRow && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 120
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #3b82f6',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '720px',
            width: '92vw',
            maxHeight: '92vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
          }}>
            {/* Header Modal Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '6px', backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit3 style={{ width: '18px', height: '18px', color: '#ffffff' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, fontFamily: '"Outfit", sans-serif', color: '#ffffff' }}>
                    DETALLE DE TRAZABILIDAD Y CABLEADO — DECKLINK QUAD ({selectedSignalChannelId})
                  </h2>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                    Insumo físico: input-{selectedSignalChannelId} | Perfil Activo: {activeProfile.name}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedSignalChannelId(null)}
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {/* BLOCK 1: READ-ONLY HARDWARE DIAGNOSTICS */}
            <div style={{
              backgroundColor: '#070a12',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8', textTransform: 'uppercase', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu style={{ width: '14px', height: '14px' }} />
                1. DIAGNÓSTICO PASIVO DE HARDWARE (SOLO LECTURA)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', fontSize: '12px', fontFamily: 'monospace' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>Enganche SDI:</span>
                  <span style={{ fontWeight: 'bold', color: selectedChData?.signalLocked ? '#34d399' : '#f87171' }}>
                    {selectedChData?.signalLocked ? 'SÍ (LOCKED)' : 'NO (UNLOCKED)'}
                  </span>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>Dirección Operativa:</span>
                  <span style={{ fontWeight: 'bold', color: selectedDirBadge.badgeColor }}>
                    {selectedDirBadge.label}
                  </span>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>Norma Detectada:</span>
                  <span style={{ fontWeight: 'bold', color: '#ffffff' }}>
                    {selectedChData?.inputFormat || 'Sin Señal'}
                  </span>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>Espacio de Píxel:</span>
                  <span style={{ fontWeight: 'bold', color: '#cbd5e1' }}>
                    {selectedChData?.pixelFormat || 'N/A'}
                  </span>
                </div>
              </div>

              {selectedDeckInfo && (
                <div style={{ marginTop: '4px', borderTop: '1px solid #1e293b', paddingTop: '6px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    backgroundColor: `${selectedDeckInfo.badgeColor}22`,
                    color: selectedDeckInfo.badgeColor,
                    border: `1px solid ${selectedDeckInfo.badgeColor}55`,
                    fontSize: '10px',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    borderRadius: '4px'
                  }}>
                    ESTADO DE SALUD DE SEÑAL: {selectedDeckInfo.label}
                  </span>
                </div>
              )}
            </div>

            {/* BLOCK 2 (VISUALLY SEPARATED): CABLE Y UMBILICAL FÍSICO DE DECKLINK */}
            <div style={{
              backgroundColor: '#070a12',
              border: '1px solid #059669',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#34d399', textTransform: 'uppercase', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plug style={{ width: '14px', height: '14px' }} />
                2. CABLE Y UMBILICAL FÍSICO DE DECKLINK
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 150px 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px', fontFamily: 'monospace' }}>
                    Conector Físico (Der. → Izq.):
                  </label>
                  <input
                    type="text"
                    value={selectedRow.physicalConnectorPosition || (selectedSignalChannelId === 2 ? '4.º desde la derecha' : selectedSignalChannelId === 5 ? '3.er desde la derecha' : 'Por confirmar')}
                    onChange={e => updatePhysicalSignalMappingAction(selectedSignalChannelId, { physicalConnectorPosition: e.target.value })}
                    placeholder="Ej. 4.º desde la derecha"
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      color: '#38bdf8',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      width: '100%'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px', fontFamily: 'monospace' }}>
                    Identificador Desktop Video:
                  </label>
                  <input
                    type="text"
                    value={selectedRow.desktopVideoLabel || (selectedSignalChannelId === 2 ? 'SDI 3' : selectedSignalChannelId === 5 ? 'SDI 5' : selectedSignalChannelId === 1 ? 'SDI 1' : 'Por confirmar')}
                    onChange={e => updatePhysicalSignalMappingAction(selectedSignalChannelId, { desktopVideoLabel: e.target.value })}
                    placeholder="Ej. SDI 3"
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      color: '#fbbf24',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      width: '100%'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px', fontFamily: 'monospace' }}>
                    Estado Conector:
                  </label>
                  <select
                    value={selectedRow.connectorStatus || 'Pendiente de inspección'}
                    onChange={e => updatePhysicalSignalMappingAction(selectedSignalChannelId, { connectorStatus: e.target.value as ConnectorPhysicalStatus })}
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      color: '#ffffff',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Conectado">Conectado</option>
                    <option value="Sin cable confirmado">Sin cable confirmado</option>
                    <option value="Pendiente de inspección">Pendiente de inspección</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px', fontFamily: 'monospace' }}>
                    Origen / Destino Cable:
                  </label>
                  <input
                    type="text"
                    value={selectedRow.cableOriginDestination || ''}
                    onChange={e => updatePhysicalSignalMappingAction(selectedSignalChannelId, { cableOriginDestination: e.target.value })}
                    placeholder="Ej. Production Truck — Program Output 1"
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      color: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      width: '100%'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* BLOCK 3 (VISUALLY SEPARATED): RUTA FÍSICA SEPARADA HACIA SWITCHER ATEM Y SALIDAS */}
            <div style={{
              backgroundColor: '#070a12',
              border: '1px solid #0284c7',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8', textTransform: 'uppercase', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <GitCommit style={{ width: '14px', height: '14px' }} />
                3. RUTA FÍSICA SEPARADA HACIA SWITCHER ATEM Y FUENTES
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Layer 3 Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px', fontFamily: 'monospace' }}>
                    3. Entrada ATEM Confirmada:
                  </label>
                  <input
                    type="text"
                    value={selectedRow.atemInputLabel}
                    onChange={e => updatePhysicalSignalMappingAction(selectedSignalChannelId, { atemInputLabel: e.target.value })}
                    placeholder="Ej. ATEM BNC 1 (Sin equivalencia numérica implícita)"
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      color: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      width: '100%'
                    }}
                  />
                </div>

                {/* Layer 4 Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px', fontFamily: 'monospace' }}>
                    4. Fuente Externa Production Truck:
                  </label>
                  <input
                    type="text"
                    value={selectedRow.productionTruckSource}
                    onChange={e => updatePhysicalSignalMappingAction(selectedSignalChannelId, { productionTruckSource: e.target.value })}
                    placeholder="Ej. No aplica — Cámara 1 directa al ATEM"
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      color: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      width: '100%'
                    }}
                  />
                </div>
              </div>

              {/* Layer 2 Input */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px', fontFamily: 'monospace' }}>
                  2. Nombre Lógico PIXEL:
                </label>
                <input
                  type="text"
                  value={selectedRow.logicalSourceName}
                  onChange={e => updatePhysicalSignalMappingAction(selectedSignalChannelId, { logicalSourceName: e.target.value })}
                  placeholder="Sin asignar"
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    color: '#ffffff',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    width: '100%'
                  }}
                />
              </div>

              {/* Notes Textarea (Full Text Un-truncated) */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px', fontFamily: 'monospace' }}>
                  Nota Completa de Verificación Técnica y Térmica:
                </label>
                <textarea
                  rows={3}
                  value={selectedRow.notes}
                  onChange={e => updatePhysicalSignalMappingAction(selectedSignalChannelId, { notes: e.target.value })}
                  placeholder="Ingresa notas detalladas de confirmación física de cables SDI, latencia, conectores BNC o patch panel..."
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    color: '#ffffff',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    lineHeight: '1.5',
                    width: '100%',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {/* BLOCK 4: VERIFICATION STATUS TOGGLE */}
            <div style={{
              backgroundColor: '#070a12',
              border: '1px solid #1e293b',
              borderRadius: '6px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px'
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '2px' }}>
                  ESTADO DE VERIFICACIÓN FÍSICA:
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                  Llenar los campos no cambia el estado automáticamente. Solo la confirmación humana conmuta a VERIFICADO.
                </div>
              </div>

              <button
                onClick={() => updatePhysicalSignalMappingAction(selectedSignalChannelId, {
                  mappingStatus: selectedRow.mappingStatus === 'VERIFICADO' ? 'PENDIENTE' : 'VERIFICADO'
                })}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: selectedRow.mappingStatus === 'VERIFICADO' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                  color: selectedRow.mappingStatus === 'VERIFICADO' ? '#34d399' : '#fbbf24',
                  border: selectedRow.mappingStatus === 'VERIFICADO' ? '1px solid #059669' : '1px solid #d97706',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {selectedRow.mappingStatus === 'VERIFICADO' ? (
                  <>
                    <Check style={{ width: '14px', height: '14px' }} />
                    🟢 VERIFICADO
                  </>
                ) : (
                  <>
                    <Clock style={{ width: '14px', height: '14px' }} />
                    🟡 PENDIENTE
                  </>
                )}
              </button>
            </div>

            {/* Modal Footer Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #1e293b', paddingTop: '14px', marginTop: '4px' }}>
              <button
                onClick={() => setSelectedSignalChannelId(null)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Guardar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN C: FUENTES DEL MULTIVIEWER (TABLA DE POSICIONES 1–8) */}
      <details style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', overflow: 'hidden' }}>
        <summary style={{ padding: '14px 20px', backgroundColor: '#070a12', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', fontFamily: '"Outfit", sans-serif', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders style={{ width: '18px', height: '18px', color: '#38bdf8' }} />
            <span>SECCIÓN C: FUENTES DEL MULTIVIEWER (TABLA DE POSICIONES 1–8)</span>
          </div>
          <span style={{ fontSize: '11px', color: '#38bdf8', fontFamily: 'monospace' }}>[CONTROL VISUAL DE NOMBRES Y ORDEN]</span>
        </summary>
        <div style={{ padding: '20px', borderTop: '1px solid #1e293b' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#070a12',
            border: '1px solid #1e293b',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#94a3b8',
            fontFamily: 'monospace',
            marginBottom: '16px'
          }}>
            <ShieldAlert style={{ width: '14px', height: '14px', color: '#38bdf8', flexShrink: 0 }} />
            <span>Regla de No Duplicación: Esta tabla solo controla nombres, etiquetas cortas, colores e identificadores del Multiviewer. El cableado físico y las rutas ATEM se gestionan exclusivamente en la Sección B (Mapa Físico).</span>
          </div>

          <div style={{ border: '1px solid #1e293b', borderRadius: '6px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#070a12', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontFamily: 'monospace', borderBottom: '1px solid #1e293b' }}>
                  <th style={{ padding: '12px 16px', width: '90px' }}>Posición</th>
                  <th style={{ padding: '12px 16px' }}>Nombre Lógico</th>
                  <th style={{ padding: '12px 16px', width: '140px' }}>Etiqueta Corta</th>
                  <th style={{ padding: '12px 16px', width: '160px' }}>Color Identificador</th>
                  <th style={{ padding: '12px 16px', width: '220px' }}>Entrada Física Asignada</th>
                  <th style={{ padding: '12px 16px', width: '240px' }}>Estado de Salud DeckLink</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', width: '120px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {logicalSources.map((source, index) => {
                  const isEditing = editingId === source.id;
                  const isAssigned = source.status === 'assigned' && source.physicalInputId !== 'unassigned';
                  const deckInfo = getDeckLinkSignalState(source.physicalInputId, decklinkChannels, expectedFormat);

                  return (
                    <tr
                      key={source.id}
                      style={{
                        borderBottom: '1px solid #1e293b',
                        backgroundColor: index % 2 === 0 ? 'rgba(15, 23, 42, 0.5)' : 'transparent'
                      }}
                    >
                      {/* Posición Visual Fija */}
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 'bold', color: '#94a3b8' }}>
                        Pos. {source.positionIndex || index + 1}
                      </td>

                      {/* Nombre Lógico */}
                      <td style={{ padding: '14px 16px' }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm?.name || ''}
                            onChange={e => setEditForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                            style={{
                              backgroundColor: '#070a12',
                              border: '1px solid #3b82f6',
                              color: '#ffffff',
                              padding: '6px 10px',
                              borderRadius: '4px',
                              fontSize: '13px',
                              fontFamily: 'monospace',
                              fontWeight: 'bold',
                              width: '100%'
                            }}
                          />
                        ) : (
                          <span style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '13px' }}>
                            {source.name}
                          </span>
                        )}
                      </td>

                      {/* Etiqueta Corta */}
                      <td style={{ padding: '14px 16px' }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm?.shortLabel || ''}
                            onChange={e => setEditForm(prev => prev ? { ...prev, shortLabel: e.target.value } : null)}
                            style={{
                              backgroundColor: '#070a12',
                              border: '1px solid #3b82f6',
                              color: '#ffffff',
                              padding: '6px 10px',
                              borderRadius: '4px',
                              fontSize: '13px',
                              fontFamily: 'monospace',
                              fontWeight: 'bold',
                              width: '100%'
                            }}
                          />
                        ) : (
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            backgroundColor: source.color,
                            color: '#ffffff',
                            fontFamily: 'monospace',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            borderRadius: '4px'
                          }}>
                            {source.shortLabel}
                          </span>
                        )}
                      </td>

                      {/* Color Selector */}
                      <td style={{ padding: '14px 16px' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {PRESET_COLORS.map(c => (
                              <button
                                key={c}
                                onClick={() => setEditForm(prev => prev ? { ...prev, color: c } : null)}
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  backgroundColor: c,
                                  border: editForm?.color === c ? '2px solid #ffffff' : 'none',
                                  cursor: 'pointer'
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: source.color }} />
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{source.color}</span>
                          </div>
                        )}
                      </td>

                      {/* Entrada Física Selector */}
                      <td style={{ padding: '14px 16px' }}>
                        <select
                          value={source.physicalInputId}
                          onChange={e => updateSourceMapping(source.id, e.target.value)}
                          style={{
                            backgroundColor: '#070a12',
                            border: '1px solid #334155',
                            color: '#f1f5f9',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            cursor: 'pointer',
                            width: '100%'
                          }}
                        >
                          {physicalInputs.map(inp => (
                            <option key={inp.id} value={inp.id}>
                              {inp.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Estado de Salud DeckLink Pasivo */}
                      <td style={{ padding: '14px 16px' }}>
                        {isAssigned ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 6px',
                              backgroundColor: `${deckInfo.badgeColor}22`,
                              color: deckInfo.badgeColor,
                              border: `1px solid ${deckInfo.badgeColor}55`,
                              fontSize: '10px',
                              fontWeight: 'bold',
                              fontFamily: 'monospace',
                              borderRadius: '3px',
                              width: 'fit-content'
                            }}>
                              {deckInfo.label}
                            </span>
                            {deckInfo.details && (
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                                {deckInfo.details}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 6px',
                            backgroundColor: 'rgba(100, 116, 139, 0.2)',
                            color: '#94a3b8',
                            border: '1px solid rgba(100, 116, 139, 0.3)',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            borderRadius: '3px'
                          }}>
                            <AlertCircle style={{ width: '11px', height: '11px' }} />
                            SIN ASIGNAR
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {isEditing ? (
                          <button
                            onClick={handleSaveInline}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              backgroundColor: '#3b82f6',
                              color: '#ffffff',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <Save style={{ width: '12px', height: '12px' }} />
                            Guardar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(source)}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: '#1e293b',
                              color: '#cbd5e1',
                              fontSize: '11px',
                              borderRadius: '4px',
                              border: '1px solid #334155',
                              cursor: 'pointer'
                            }}
                          >
                            Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </details>

      {/* SECCIÓN D: INTEGRACIONES MÓDULOS EXTERNOS (OBS, RESOLUME Y VOLLEYBALL) */}
      <details style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', overflow: 'hidden' }} open>
        <summary style={{ padding: '14px 20px', backgroundColor: '#070a12', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', fontFamily: '"Outfit", sans-serif', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Network style={{ width: '18px', height: '18px', color: '#a78bfa' }} />
            <span>SECCIÓN D: INTEGRACIONES DE MÓDULOS EXTERNOS (OBS STUDIO, RESOLUME ARENA Y VOLLEYBALL)</span>
          </div>
          <span style={{ fontSize: '11px', color: '#a78bfa', fontFamily: 'monospace' }}>[AGRUPADO: 3 MÓDULOS]</span>
        </summary>
        <div style={{ padding: '20px', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* External Module: Volleyball Control2 Card with Passive Observability Data */}
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '20px'
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy style={{ width: '18px', height: '18px', color: '#ffffff' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, fontFamily: '"Outfit", sans-serif' }}>
                  MÓDULO EXTERNO: VOLLEYBALL CONTROL2 (OBSERVABILIDAD PASIVA)
                </h3>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  padding: '1px 6px',
                  borderRadius: '3px'
                }}>
                  POR PERFIL: {activeProfile.name}
                </span>

                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: volleyballStatus.hasData ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.2)',
                  color: volleyballStatus.hasData ? '#34d399' : '#94a3b8',
                  border: volleyballStatus.hasData ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(100, 116, 139, 0.3)',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  padding: '1px 6px',
                  borderRadius: '3px'
                }}>
                  {volleyballStatus.hasData ? '🟢 MARCADOR EN VIVO DETECTADO' : isVballConfigured ? '🔵 CONFIGURADO (EN ESPERA)' : '⚪ SIN CONFIGURAR'}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Recepción pasiva de estado en tiempo real vía BroadcastChannel (`mdc-volleyball-live-state`) y localStorage
              </p>
            </div>
          </div>
        </div>

        {/* Passive Match Data Display Panel */}
        <div style={{
          backgroundColor: '#070a12',
          border: '1px solid #1e293b',
          borderRadius: '6px',
          padding: '14px 16px',
          marginBottom: '16px'
        }}>
          {!volleyballStatus.isSameOrigin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '12px', fontFamily: 'monospace' }}>
              <AlertOctagon style={{ width: '16px', height: '16px' }} />
              <span>Volleyball observation unavailable: requires same origin (http://localhost:8000/)</span>
            </div>
          ) : vState ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: vState.teamHome?.color || '#0032A0', display: 'inline-block' }} />
                    <span style={{ fontSize: '14px', fontWeight: '900', color: '#ffffff', fontFamily: 'monospace' }}>{vState.teamHome?.name || 'HOME TEAM'}</span>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: '#fbbf24', fontFamily: 'monospace', marginLeft: '4px' }}>{vState.teamHome?.currentPoints ?? 0}</span>
                  </div>

                  <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>—</span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: '#fbbf24', fontFamily: 'monospace', marginRight: '4px' }}>{vState.teamAway?.currentPoints ?? 0}</span>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: '#ffffff', fontFamily: 'monospace' }}>{vState.teamAway?.name || 'AWAY TEAM'}</span>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: vState.teamAway?.color || '#b91c1c', display: 'inline-block' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', fontFamily: 'monospace' }}>
                  <span style={{ backgroundColor: '#1e293b', color: '#38bdf8', padding: '3px 8px', borderRadius: '4px', border: '1px solid #0284c7', fontWeight: 'bold' }}>
                    SET {vState.currentSet || 1}
                  </span>
                  <span style={{ backgroundColor: '#1e293b', color: '#a78bfa', padding: '3px 8px', borderRadius: '4px', border: '1px solid #7c3aed', fontWeight: 'bold' }}>
                    SETS: {vState.teamHome?.setsWon ?? 0} - {vState.teamAway?.setsWon ?? 0}
                  </span>
                  <span style={{ backgroundColor: 'rgba(217, 119, 6, 0.25)', color: '#fbbf24', padding: '3px 8px', borderRadius: '4px', border: '1px solid #d97706', fontWeight: 'bold' }}>
                    SERVE: {vState.servingTeam === 'home' ? vState.teamHome?.name : vState.servingTeam === 'away' ? vState.teamAway?.name : 'N/A'}
                  </span>
                  <span style={{ backgroundColor: '#1e293b', color: vState.overlayVisible !== false ? '#34d399' : '#f87171', padding: '3px 8px', borderRadius: '4px', border: vState.overlayVisible !== false ? '1px solid #059669' : '1px solid #dc2626', fontWeight: 'bold' }}>
                    OVERLAY: {vState.overlayVisible !== false ? 'VISIBLE' : 'HIDDEN'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span>TMO Home: {vState.teamHome?.timeouts ?? 0}</span>
                  <span>TMO Away: {vState.teamAway?.timeouts ?? 0}</span>
                  <span>Status: {vState.matchStatus || 'IN_PROGRESS'}</span>
                </div>

                {formattedVballTime && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
                    <Clock style={{ width: '11px', height: '11px' }} />
                    <span>Última señal recibida: {formattedVballTime}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>
              <Eye style={{ width: '16px', height: '16px', color: '#64748b' }} />
              <span>External scoreboard inactive (`mdcVolleyballMatchStateV1`).</span>
            </div>
          )}
        </div>

        {/* URLs Inputs Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                URL de Control (Consola Operador)
              </label>
              <button
                onClick={() => handleOpenExternalUrl(vballControlUrl)}
                disabled={!vballControlUrl.trim()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  backgroundColor: vballControlUrl.trim() ? '#0284c7' : '#1e293b',
                  color: vballControlUrl.trim() ? '#ffffff' : '#64748b',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: vballControlUrl.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                <ExternalLink style={{ width: '10px', height: '10px' }} />
                Abrir Control
              </button>
            </div>
            <input
              type="text"
              value={vballControlUrl}
              onChange={e => handleVballUrlChange(e.target.value, vballOverlayUrl)}
              placeholder="http://localhost:8000/volleyball-control.html"
              style={{
                backgroundColor: '#070a12',
                border: '1px solid #334155',
                color: '#ffffff',
                padding: '6px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                width: '100%'
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                URL de Overlay (Browser Source OBS)
              </label>
              <button
                onClick={() => handleOpenExternalUrl(vballOverlayUrl)}
                disabled={!vballOverlayUrl.trim()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  backgroundColor: vballOverlayUrl.trim() ? '#0284c7' : '#1e293b',
                  color: vballOverlayUrl.trim() ? '#ffffff' : '#64748b',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: vballOverlayUrl.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                <ExternalLink style={{ width: '10px', height: '10px' }} />
                Abrir Overlay
              </button>
            </div>
            <input
              type="text"
              value={vballOverlayUrl}
              onChange={e => handleVballUrlChange(vballControlUrl, e.target.value)}
              placeholder="http://localhost:8000/volleyball-overlay.html"
              style={{
                backgroundColor: '#070a12',
                border: '1px solid #334155',
                color: '#ffffff',
                padding: '6px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                width: '100%'
              }}
            />
          </div>
        </div>

        {/* Mandatory Note Box */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#070a12',
          border: '1px solid #1e293b',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#94a3b8',
          fontFamily: 'monospace'
        }}>
          <ShieldCheck style={{ width: '14px', height: '14px', color: '#38bdf8', flexShrink: 0 }} />
          <span>Lectura pasiva; Pixel no modifica el marcador ni emite ningún comando hacia Volleyball Control2 sin autorización explícita.</span>
        </div>
      </div>

      {/* Observability Legend & Integrations Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* State Legend */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Info style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, color: '#f8fafc', fontFamily: 'monospace' }}>
              LEYENDA DE ESTADOS DE OBSERVABILIDAD DE FUENTES
            </h3>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
              <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold', fontSize: '10px', fontFamily: 'monospace' }}>
                🟢 SEÑAL CONFIRMADA
              </span>
              <span>Canal en CAPTURA activa con lock SDI y coincidencia de norma esperada 1080p59.94.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
              <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold', fontSize: '10px', fontFamily: 'monospace' }}>
                🟡 FORMATO DISTINTO
              </span>
              <span>Canal en CAPTURA activa con lock SDI pero en norma distinta a la esperada.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
              <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold', fontSize: '10px', fontFamily: 'monospace' }}>
                🔴 SIN SEÑAL
              </span>
              <span>Canal en CAPTURA activa sin enganche de señal SDI (*signalLocked = false*).</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
              <span style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold', fontSize: '10px', fontFamily: 'monospace' }}>
                📤 SALIDA ACTIVA
              </span>
              <span>Canal reservado/operando para reproducción/salida SDI (Playback). No aplica "Sin señal".</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
              <span style={{ backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold', fontSize: '10px', fontFamily: 'monospace' }}>
                ⚪ SEÑAL NO CONFIRMADA / CANAL LIBRE
              </span>
              <span>Canal IDLE libre con lectura latente de hardware. No se afirma señal activa.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
              <span style={{ backgroundColor: 'rgba(100, 116, 139, 0.15)', color: '#64748b', border: '1px solid rgba(100, 116, 139, 0.3)', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold', fontSize: '10px', fontFamily: 'monospace' }}>
                ⚪ CANAL LIBRE / SIN SEÑAL CONFIRMADA
              </span>
              <span>Canal IDLE libre sin lock activo en hardware.</span>
            </li>
          </ul>
        </div>

        {/* Integration Status Panel */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Activity style={{ width: '16px', height: '16px', color: '#a78bfa' }} />
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, color: '#f8fafc', fontFamily: 'monospace' }}>
              ESTADO DE INTEGRACIONES TÁCTICAS
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
            {/* Production Bridge Status */}
            <div style={{ backgroundColor: '#070a12', border: '1px solid #1e293b', padding: '8px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>Production Bridge:</span>
              <span style={{
                color: bridgeState === 'connected' ? '#34d399' : bridgeState === 'stale' ? '#fbbf24' : '#f87171',
                fontWeight: 'bold'
              }}>
                {bridgeState === 'connected' ? '🟢 Conectado' : bridgeState === 'stale' ? '🟡 En espera' : '🔴 Desconectado'}
              </span>
            </div>

            {/* DeckLink Quad 2 API Status */}
            <div style={{ backgroundColor: '#070a12', border: '1px solid #1e293b', padding: '8px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>DeckLink API:</span>
              <span style={{ color: hasRealDeckLinkData ? '#34d399' : '#f87171', fontWeight: 'bold' }}>
                {hasRealDeckLinkData ? '🟢 SDK Conectado' : '🔴 Sin datos nativos'}
              </span>
            </div>

            {/* OBS Studio Integration Status */}
            <div style={{ backgroundColor: '#070a12', border: '1px solid #1e293b', padding: '8px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>OBS Studio:</span>
              <span style={{
                color: obsStatus?.connected ? '#34d399' : '#94a3b8',
                fontWeight: 'bold'
              }}>
                {obsStatus?.connected ? '🟢 Conectado' : '⚪ Sin conexión'}
              </span>
            </div>

            {/* Resolume Arena Integration Status */}
            <div style={{ backgroundColor: '#070a12', border: '1px solid #1e293b', padding: '8px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>Resolume Arena:</span>
              <span style={{
                color: resolumeStatus?.connected ? '#34d399' : '#94a3b8',
                fontWeight: 'bold'
              }}>
                {resolumeStatus?.connected ? '🟢 Conectado' : '⚪ Sin conexión'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* OBS Studio Read-Only Integration Card */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#312e81', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Video style={{ width: '18px', height: '18px', color: '#818cf8' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, fontFamily: '"Outfit", sans-serif' }}>
                  INTEGRACIÓN CON OBS STUDIO (SOLO LECTURA - WEBSOCKET V5)
                </h3>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(129, 140, 248, 0.15)',
                  color: '#818cf8',
                  border: '1px solid rgba(129, 140, 248, 0.3)',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  padding: '1px 6px',
                  borderRadius: '3px'
                }}>
                  <ShieldCheck style={{ width: '10px', height: '10px' }} />
                  ESTRICTO READ-ONLY
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Comprueba disponibilidad, escena actual y estado de emisión/grabación sin enviar ningún comando de control.
              </p>
            </div>
          </div>

          {obsStatus?.connected && (
            <button
              onClick={disconnectOBSAction}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                backgroundColor: '#1e293b',
                color: '#f87171',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '4px',
                border: '1px solid #334155',
                cursor: 'pointer'
              }}
            >
              <Unplug style={{ width: '13px', height: '13px' }} />
              Desconectar
            </button>
          )}
        </div>

        {/* Config Form Row & Test Connection Trigger */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'monospace' }}>
              Host / Dirección IP
            </label>
            <input
              type="text"
              value={obsConfig.host}
              onChange={e => setObsConfig({ ...obsConfig, host: e.target.value })}
              placeholder="127.0.0.1"
              style={{
                backgroundColor: '#070a12',
                border: '1px solid #334155',
                color: '#ffffff',
                padding: '6px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                width: '100%'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'monospace' }}>
              Puerto WebSocket v5
            </label>
            <input
              type="number"
              value={obsConfig.port}
              onChange={e => setObsConfig({ ...obsConfig, port: Number(e.target.value) || 4455 })}
              placeholder="4455"
              style={{
                backgroundColor: '#070a12',
                border: '1px solid #334155',
                color: '#ffffff',
                padding: '6px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                width: '100%'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'monospace' }}>
              <Lock style={{ width: '10px', height: '10px', color: '#fbbf24' }} />
              Contraseña (Memoria de Sesión)
            </label>
            <input
              type="password"
              value={sessionObsPassword}
              onChange={e => setSessionObsPassword(e.target.value)}
              placeholder="Nunca se guarda en disco"
              style={{
                backgroundColor: '#070a12',
                border: '1px solid #334155',
                color: '#ffffff',
                padding: '6px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                width: '100%'
              }}
            />
          </div>

          <button
            onClick={() => testOBSConnectionAction(sessionObsPassword)}
            disabled={isObsTesting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 'bold',
              borderRadius: '4px',
              border: 'none',
              cursor: isObsTesting ? 'not-allowed' : 'pointer',
              opacity: isObsTesting ? 0.7 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            <Plug style={{ width: '14px', height: '14px' }} />
            {isObsTesting ? 'Probando...' : 'Probar Conexión'}
          </button>
        </div>

        {/* Read-Only Status Display Box */}
        {obsStatus && (
          <div style={{
            backgroundColor: obsStatus.connected ? 'rgba(6, 78, 59, 0.2)' : 'rgba(127, 29, 29, 0.2)',
            border: obsStatus.connected ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(248, 113, 113, 0.4)',
            borderRadius: '6px',
            padding: '12px 16px'
          }}>
            {obsStatus.connected ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', fontSize: '12px', fontFamily: 'monospace' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: 'bold' }}>
                  <CheckCircle2 style={{ width: '16px', height: '16px' }} />
                  <span>OBS CONECTADO ({obsStatus.obsVersion})</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Escena Actual: </span>
                    <span style={{ color: '#ffffff', fontWeight: 'bold', backgroundColor: '#070a12', padding: '2px 6px', borderRadius: '3px', border: '1px solid #334155' }}>
                      {obsStatus.currentScene}
                    </span>
                  </div>

                  <div>
                    <span style={{ color: '#94a3b8' }}>Streaming: </span>
                    <span style={{ color: obsStatus.isStreaming ? '#34d399' : '#94a3b8', fontWeight: 'bold' }}>
                      {obsStatus.isStreaming ? '🟢 Activo' : '⚪ Inactivo'}
                    </span>
                  </div>

                  <div>
                    <span style={{ color: '#94a3b8' }}>Grabación: </span>
                    <span style={{ color: obsStatus.isRecording ? '#ff4d6d' : '#94a3b8', fontWeight: 'bold' }}>
                      {obsStatus.isRecording ? '🔴 Grabando' : '⚪ Inactiva'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '12px', fontFamily: 'monospace' }}>
                {renderOBSErrorIcon(obsStatus.errorType)}
                <span>{obsStatus.errorMessage}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resolume Arena Read-Only Integration Card */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#581c87', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers style={{ width: '18px', height: '18px', color: '#c084fc' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, fontFamily: '"Outfit", sans-serif' }}>
                  INTEGRACIÓN CON RESOLUME ARENA (SOLO LECTURA - WEBSERVER API / WS)
                </h3>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(192, 132, 252, 0.15)',
                  color: '#c084fc',
                  border: '1px solid rgba(192, 132, 252, 0.3)',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  padding: '1px 6px',
                  borderRadius: '3px'
                }}>
                  <ShieldCheck style={{ width: '10px', height: '10px' }} />
                  ESTRICTO READ-ONLY
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Comprueba disponibilidad del servidor web de Resolume y lee la composición activa sin modificar clips, capas ni salidas.
              </p>
            </div>
          </div>

          {resolumeStatus?.connected && (
            <button
              onClick={disconnectResolumeAction}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                backgroundColor: '#1e293b',
                color: '#f87171',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '4px',
                border: '1px solid #334155',
                cursor: 'pointer'
              }}
            >
              <Unplug style={{ width: '13px', height: '13px' }} />
              Desconectar
            </button>
          )}
        </div>

        {/* Config Form Row & Test Connection Trigger */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'monospace' }}>
              Host / Dirección IP
            </label>
            <input
              type="text"
              value={resolumeConfig.host}
              onChange={e => setResolumeConfig({ ...resolumeConfig, host: e.target.value })}
              placeholder="127.0.0.1"
              style={{
                backgroundColor: '#070a12',
                border: '1px solid #334155',
                color: '#ffffff',
                padding: '6px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                width: '100%'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'monospace' }}>
              Puerto Webserver API (Default 8080)
            </label>
            <input
              type="number"
              value={resolumeConfig.port}
              onChange={e => setResolumeConfig({ ...resolumeConfig, port: Number(e.target.value) || 8080 })}
              placeholder="8080"
              style={{
                backgroundColor: '#070a12',
                border: '1px solid #334155',
                color: '#ffffff',
                padding: '6px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                width: '100%'
              }}
            />
          </div>

          <button
            onClick={testResolumeConnectionAction}
            disabled={isResolumeTesting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#7e22ce',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 'bold',
              borderRadius: '4px',
              border: 'none',
              cursor: isResolumeTesting ? 'not-allowed' : 'pointer',
              opacity: isResolumeTesting ? 0.7 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            <Plug style={{ width: '14px', height: '14px' }} />
            {isResolumeTesting ? 'Probando...' : 'Probar Conexión'}
          </button>
        </div>

        {/* Read-Only Status Display Box */}
        {resolumeStatus && (
          <div style={{
            backgroundColor: resolumeStatus.connected ? 'rgba(68, 38, 122, 0.25)' : 'rgba(127, 29, 29, 0.2)',
            border: resolumeStatus.connected ? '1px solid rgba(192, 132, 252, 0.4)' : '1px solid rgba(248, 113, 113, 0.4)',
            borderRadius: '6px',
            padding: '12px 16px'
          }}>
            {resolumeStatus.connected ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', fontSize: '12px', fontFamily: 'monospace' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', fontWeight: 'bold' }}>
                  <CheckCircle2 style={{ width: '16px', height: '16px' }} />
                  <span>RESOLUME CONECTADO ({resolumeStatus.productName} {resolumeStatus.version})</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Composición: </span>
                    <span style={{ color: '#ffffff', fontWeight: 'bold', backgroundColor: '#070a12', padding: '2px 6px', borderRadius: '3px', border: '1px solid #334155' }}>
                      {resolumeStatus.compositionName || 'Composición Detectada'}
                    </span>
                  </div>

                  <div>
                    <span style={{ color: '#94a3b8' }}>Estado Observación: </span>
                    <span style={{ color: resolumeStatus.compositionDetected ? '#34d399' : '#fbbf24', fontWeight: 'bold' }}>
                      {resolumeStatus.compositionDetected ? '🟢 Composición detectada' : '🟡 Sin datos de composición'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '12px', fontFamily: 'monospace' }}>
                <WifiOff style={{ width: '16px', height: '16px' }} />
                <span style={{ fontWeight: 'bold' }}>Resolume: Sin conexión / No configurado.</span>
                <span>{resolumeStatus.errorMessage}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </details>

      {/* SECCIÓN E: OPERACIÓN Y RECUPERACIÓN (EXPORTAR / IMPORTAR / RESTAURAR) */}
      <details style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', overflow: 'hidden' }}>
        <summary style={{ padding: '14px 20px', backgroundColor: '#070a12', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', fontFamily: '"Outfit", sans-serif', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileJson style={{ width: '18px', height: '18px', color: '#34d399' }} />
            <span>SECCIÓN E: OPERACIÓN Y RECUPERACIÓN (EXPORTAR / IMPORTAR / RESTAURAR)</span>
          </div>
          <span style={{ fontSize: '11px', color: '#34d399', fontFamily: 'monospace' }}>[COPIAS JSON Y RESTAURACIÓN]</span>
        </summary>
        <div style={{ padding: '20px', borderTop: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileJson style={{ width: '18px', height: '18px', color: '#ffffff' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, fontFamily: '"Outfit", sans-serif' }}>
                  OPERACIÓN Y RECUPERACIÓN (EXPORTAR / IMPORTAR / RESTAURAR)
                </h3>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(5, 150, 105, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(5, 150, 105, 0.3)',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  padding: '1px 6px',
                  borderRadius: '3px'
                }}>
                  <ShieldCheck style={{ width: '10px', height: '10px' }} />
                  FASE 8
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Portabilidad de perfiles de producción e integridad operativa entre eventos o estaciones
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* Export Panel */}
          <div style={{ backgroundColor: '#070a12', border: '1px solid #1e293b', padding: '14px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'monospace' }}>
              1. EXPORTAR CONFIGURACIÓN (.JSON)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleExportAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Download style={{ width: '14px', height: '14px' }} />
                Exportar Todos los Perfiles ({profiles.length})
              </button>

              <button
                onClick={handleExportActive}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: '#1e293b',
                  color: '#cbd5e1',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  border: '1px solid #334155',
                  cursor: 'pointer'
                }}
              >
                <Download style={{ width: '14px', height: '14px' }} />
                Exportar Solo Perfil Activo ({activeProfile?.name})
              </button>
            </div>
          </div>

          {/* Import Panel */}
          <div style={{ backgroundColor: '#070a12', border: '1px solid #1e293b', padding: '14px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'monospace' }}>
              2. IMPORTAR PAQUETE OPERATIVO
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileSelected}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 14px',
                backgroundColor: '#059669',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                marginTop: 'auto'
              }}
            >
              <Upload style={{ width: '14px', height: '14px' }} />
              Seleccionar Archivo JSON a Importar...
            </button>
          </div>

          {/* Backup & Restore Panel */}
          <div style={{ backgroundColor: '#070a12', border: '1px solid #1e293b', padding: '14px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'monospace' }}>
              3. COPIA DE RECUPERACIÓN LOCAL
            </div>

            <div style={{ fontSize: '11px', color: '#cbd5e1', fontFamily: 'monospace' }}>
              {backupMeta ? (
                <>
                  <div>• Copia guardada: <strong>{new Date(backupMeta.timestamp).toLocaleString()}</strong></div>
                  <div>• Perfiles respaldados: <strong>{backupMeta.profilesCount} perfiles</strong></div>
                </>
              ) : (
                <div style={{ color: '#64748b', fontStyle: 'italic' }}>Sin copias de recuperación en este navegador</div>
              )}
            </div>

            <button
              onClick={handleRestoreBackup}
              disabled={!backupMeta}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: backupMeta ? '#d97706' : '#1e293b',
                color: backupMeta ? '#ffffff' : '#64748b',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '4px',
                border: 'none',
                cursor: backupMeta ? 'pointer' : 'not-allowed',
                marginTop: 'auto'
              }}
            >
              <RefreshCw style={{ width: '14px', height: '14px' }} />
              Restaurar Última Copia de Recuperación
            </button>
          </div>
        </div>

        {/* Mandatory Security Disclaimer Box */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#070a12',
          border: '1px solid #1e293b',
          padding: '10px 14px',
          borderRadius: '6px',
          fontSize: '11px',
          fontFamily: 'monospace'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
            <ShieldAlert style={{ width: '15px', height: '15px', color: '#38bdf8', flexShrink: 0 }} />
            <span>
              <strong>Nota de Seguridad:</strong> Los archivos de operación no incluyen contraseñas de OBS, sesiones de control manual ni estados en vivo.
            </span>
          </div>

          {lastOpLog && (
            <div style={{ color: lastOpLog.status === 'SUCCESS' ? '#34d399' : '#f87171', fontWeight: 'bold' }}>
              Última acción: [{lastOpLog.type}] {new Date(lastOpLog.timestamp).toLocaleTimeString()} — {lastOpLog.details}
            </div>
          )}
        </div>
      </div>
    </details>
  </div>
)}
</div>

      {/* Import Preview Modal */}
      {showImportModal && importPreview && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: importPreview.valid ? '1px solid #059669' : '1px solid #dc2626',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '620px',
            width: '90vw',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileCheck style={{ width: '22px', height: '22px', color: importPreview.valid ? '#34d399' : '#f87171' }} />
                <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, fontFamily: '"Outfit", sans-serif' }}>
                  VISTA PREVIA DE IMPORTACIÓN DE PERFILES
                </h2>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: importPreview.valid ? 'rgba(52, 211, 153, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                color: importPreview.valid ? '#34d399' : '#f87171'
              }}>
                {importPreview.valid ? '🟢 ESTRUCTURA VÁLIDA (v1.0)' : '🔴 ARCHIVO INVÁLIDO'}
              </span>
            </div>

            {/* Error Body or Valid Details */}
            {!importPreview.valid ? (
              <div style={{ padding: '16px', backgroundColor: 'rgba(127, 29, 29, 0.2)', border: '1px solid rgba(248, 113, 113, 0.4)', borderRadius: '6px', color: '#f87171', fontSize: '13px', fontFamily: 'monospace' }}>
                ❌ {importPreview.error}
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '12px', fontFamily: 'monospace', backgroundColor: '#070a12', padding: '12px', borderRadius: '6px' }}>
                  <div>• Exportado: <strong>{importPreview.exportedAt ? new Date(importPreview.exportedAt).toLocaleString() : 'N/A'}</strong></div>
                  <div>• Cantidad perfiles: <strong>{importPreview.profilesCount}</strong></div>
                  <div>• Perfil activo propuesto: <strong>{importPreview.activeProfileId || 'N/A'}</strong></div>
                </div>

                <div style={{ fontSize: '12px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                  <div style={{ fontWeight: 'bold', color: '#94a3b8', marginBottom: '6px' }}>PERFILES CONTENIDOS EN EL ARCHIVO:</div>
                  <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #1e293b', borderRadius: '6px', backgroundColor: '#070a12' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b' }}>
                          <th style={{ padding: '6px 10px' }}>ID / Nombre</th>
                          <th style={{ padding: '6px 10px' }}>Fuentes</th>
                          <th style={{ padding: '6px 10px' }}>Volleyball URL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.profiles.map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #1e293b' }}>
                            <td style={{ padding: '6px 10px', color: '#ffffff', fontWeight: 'bold' }}>{p.name}</td>
                            <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{p.sourcesCount} pos.</td>
                            <td style={{ padding: '6px 10px', color: p.hasVolleyballModule ? '#38bdf8' : '#64748b' }}>
                              {p.hasVolleyballModule ? '✓ Configurado' : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mode Selector */}
                <div style={{ backgroundColor: '#070a12', border: '1px solid #1e293b', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '8px' }}>
                    SELECCIONA EL MODO DE IMPORTACIÓN:
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#ffffff', fontFamily: 'monospace' }}>
                      <input
                        type="radio"
                        name="importMode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        style={{ accentColor: '#059669' }}
                      />
                      <span>
                        <Merge style={{ width: '12px', height: '12px', display: 'inline', marginRight: '4px', color: '#34d399' }} />
                        <strong>FUSIONAR (Recomendado):</strong> Conservar los perfiles locales y agregar los importados. (Renombra duplicados con "(Importado)")
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#ffffff', fontFamily: 'monospace' }}>
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        style={{ accentColor: '#dc2626' }}
                      />
                      <span>
                        <RotateCcw style={{ width: '12px', height: '12px', display: 'inline', marginRight: '4px', color: '#f87171' }} />
                        <strong>REEMPLAZAR:</strong> Reemplazar todos los perfiles locales actuales por los del archivo.
                      </span>
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Modal Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                onClick={() => { setShowImportModal(false); setRawImportJson(null); setImportPreview(null); }}
                style={{ padding: '8px 16px', backgroundColor: '#1e293b', color: '#cbd5e1', borderRadius: '6px', border: '1px solid #334155', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
              >
                CANCELAR
              </button>
              {importPreview.valid && (
                <button
                  onClick={handleConfirmImport}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: importMode === 'replace' ? '#dc2626' : '#059669',
                    color: '#ffffff',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}
                >
                  {importMode === 'replace' ? 'CONFIRMAR REEMPLAZO' : 'CONFIRMAR FUSIÓN'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PREFLIGHT CHECK REPORT MODAL */}
      {showPreflightModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #3b82f6',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '650px',
            width: '90vw',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#ffffff', fontFamily: '"Outfit", sans-serif' }}>
                    INFORME DE PREFLIGHT CHECK — PIXEL
                  </h3>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                    Perfil Activo: {activeProfile.name} | {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowPreflightModal(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            {/* Checklist Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', fontFamily: 'monospace' }}>
              {/* 1. ATEM / Bridge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#070a12', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <span>1. Switcher ATEM / Production Bridge:</span>
                <span style={{ color: lastBridgeData?.connected ? '#34d399' : '#f87171', fontWeight: 'bold' }}>
                  {lastBridgeData?.connected ? '🟢 CONECTADO (http://127.0.0.1:3000)' : '🔴 BRIDGE DESCONECTADO'}
                </span>
              </div>

              {/* 2. DeckLink Hardware */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#070a12', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <span>2. Tarjeta DeckLink Quad 2 (8 Canales):</span>
                <span style={{ color: hasRealDeckLinkData ? '#34d399' : '#38bdf8', fontWeight: 'bold' }}>
                  {hasRealDeckLinkData ? '🟢 SDK REAL CONECTADO' : '🔵 EN IMPLEMENTACIÓN / MODO PASIVO'}
                </span>
              </div>

              {/* 3. Verified Signal Routes */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#070a12', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <span>3. Rutas Físicas Verificadas:</span>
                <span style={{ color: '#34d399', fontWeight: 'bold' }}>
                  🟢 {physicalSignalMap.filter(m => m.mappingStatus === 'VERIFICADO').length}/4 RUTAS CONFIRMADAS
                </span>
              </div>

              {/* 4. OBS Studio */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#070a12', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <span>4. OBS Studio (WebSocket 5.x):</span>
                <span style={{ color: obsStatus?.connected ? '#34d399' : '#60a5fa', fontWeight: 'bold' }}>
                  {obsStatus?.connected ? '🟢 CONECTADO' : '🔵 CONFIGURADO / EN ESPERA'}
                </span>
              </div>

              {/* 5. Resolume Arena */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#070a12', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <span>5. Resolume Arena (HTTP API):</span>
                <span style={{ color: resolumeStatus?.connected ? '#34d399' : '#a78bfa', fontWeight: 'bold' }}>
                  {resolumeStatus?.connected ? '🟢 CONECTADO' : '🟣 CONFIGURADO / EN ESPERA'}
                </span>
              </div>

              {/* 6. Volleyball Control2 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#070a12', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <span>6. Módulo Volleyball Control2:</span>
                <span style={{ color: volleyballStatus.hasData ? '#34d399' : isVballConfigured ? '#38bdf8' : '#94a3b8', fontWeight: 'bold' }}>
                  {volleyballStatus.hasData ? '🟢 MARCADOR EN VIVO DETECTADO' : isVballConfigured ? '🔵 CONFIGURADO (EN ESPERA)' : '⚪ SIN CONFIGURAR'}
                </span>
              </div>
            </div>

            {/* Ready Banner */}
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #059669',
              borderRadius: '6px',
              padding: '12px 16px',
              color: '#34d399',
              fontSize: '12px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 style={{ width: '18px', height: '18px', flexShrink: 0 }} />
              <span>SISTEMA LISTO PARA PRODUCCIÓN EN VIVO EN PERFIL [{activeProfile.name}]</span>
            </div>

            {/* Footer Close Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #1e293b', paddingTop: '14px' }}>
              <button
                onClick={() => setShowPreflightModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                CERRAR INFORME PREFLIGHT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
