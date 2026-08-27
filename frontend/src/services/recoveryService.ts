import type { ProductionProfile } from '../types/profiles';
import type { LogicalSource } from '../types/sources';
import type { PixelExportPackage, ImportPreviewData, RecoveryOperationLog } from '../types/recovery';

const LOCAL_STORAGE_KEY_BACKUP_PROFILES = 'pixel_v1_backup_profiles_v1';
const LOCAL_STORAGE_KEY_BACKUP_ACTIVE_PROFILE = 'pixel_v1_backup_active_profile_v1';
const LOCAL_STORAGE_KEY_BACKUP_SOURCES = 'pixel_v1_backup_sources_v1';
const LOCAL_STORAGE_KEY_BACKUP_META = 'pixel_v1_backup_meta_v1';
const LOCAL_STORAGE_KEY_RECOVERY_LOG = 'pixel_v1_recovery_last_log_v1';

/**
 * Clean copy helper to strip transient or sensitive properties before export
 */
function sanitizeProfilesForExport(profiles: ProductionProfile[]): ProductionProfile[] {
  return JSON.parse(JSON.stringify(profiles)).map((p: any) => {
    // Ensure clean structure and omit non-exportable fields
    return {
      id: p.id,
      name: p.name,
      description: p.description || '',
      isBuiltin: Boolean(p.isBuiltin),
      updatedAt: p.updatedAt || new Date().toISOString(),
      sources: Array.isArray(p.sources) ? p.sources : [],
      volleyballModule: p.volleyballModule ? {
        name: p.volleyballModule.name || 'Volleyball Control2',
        controlUrl: p.volleyballModule.controlUrl || '',
        overlayUrl: p.volleyballModule.overlayUrl || ''
      } : undefined
    };
  });
}

/**
 * Triggers a browser file download of JSON text
 */
function triggerJsonDownload(filename: string, jsonString: string): void {
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export all production profiles to downloadable JSON file
 */
export function exportAllProfiles(profiles: ProductionProfile[], activeProfileId: string): RecoveryOperationLog {
  try {
    const sanitized = sanitizeProfilesForExport(profiles);
    const exportPkg: PixelExportPackage = {
      version: '1.0',
      system: 'PIXEL_OPERATIONAL_PROFILES',
      exportedAt: new Date().toISOString(),
      activeProfileId: activeProfileId,
      profiles: sanitized
    };

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `pixel_profiles_all_${dateStr}.json`;
    triggerJsonDownload(filename, JSON.stringify(exportPkg, null, 2));

    const log: RecoveryOperationLog = {
      timestamp: new Date().toISOString(),
      type: 'EXPORT_ALL',
      status: 'SUCCESS',
      details: `Exportados ${sanitized.length} perfiles a "${filename}"`
    };
    saveLastOperationLog(log);
    return log;
  } catch (err: any) {
    const log: RecoveryOperationLog = {
      timestamp: new Date().toISOString(),
      type: 'EXPORT_ALL',
      status: 'ERROR',
      details: `Error al exportar: ${err?.message || 'Error desconocido'}`
    };
    saveLastOperationLog(log);
    return log;
  }
}

/**
 * Export ONLY the active profile to downloadable JSON file
 */
export function exportActiveProfile(profiles: ProductionProfile[], activeProfileId: string): RecoveryOperationLog {
  try {
    const activeProf = profiles.find(p => p.id === activeProfileId);
    if (!activeProf) {
      throw new Error(`Perfil activo "${activeProfileId}" no encontrado.`);
    }

    const sanitized = sanitizeProfilesForExport([activeProf]);
    const exportPkg: PixelExportPackage = {
      version: '1.0',
      system: 'PIXEL_OPERATIONAL_PROFILES',
      exportedAt: new Date().toISOString(),
      activeProfileId: activeProfileId,
      profiles: sanitized
    };

    const cleanName = activeProf.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `pixel_profile_${cleanName}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`;
    triggerJsonDownload(filename, JSON.stringify(exportPkg, null, 2));

    const log: RecoveryOperationLog = {
      timestamp: new Date().toISOString(),
      type: 'EXPORT_ACTIVE',
      status: 'SUCCESS',
      details: `Exportado perfil activo "${activeProf.name}" a "${filename}"`
    };
    saveLastOperationLog(log);
    return log;
  } catch (err: any) {
    const log: RecoveryOperationLog = {
      timestamp: new Date().toISOString(),
      type: 'EXPORT_ACTIVE',
      status: 'ERROR',
      details: `Error al exportar perfil activo: ${err?.message || 'Error desconocido'}`
    };
    saveLastOperationLog(log);
    return log;
  }
}

/**
 * Validates JSON text schema and returns a structured preview
 */
export function validateAndPreviewImport(jsonText: string): ImportPreviewData {
  try {
    const parsed = JSON.parse(jsonText);

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, profilesCount: 0, profiles: [], error: 'El archivo JSON no es un objeto válido.' };
    }

    // Check system tag or profiles array
    if (parsed.system !== 'PIXEL_OPERATIONAL_PROFILES' && !Array.isArray(parsed.profiles)) {
      return {
        valid: false,
        profilesCount: 0,
        profiles: [],
        error: 'Estructura o versión no compatible. Se requiere un paquete de perfiles de Pixel.'
      };
    }

    const rawProfiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];
    if (rawProfiles.length === 0) {
      return { valid: false, profilesCount: 0, profiles: [], error: 'El archivo no contiene ningún perfil de producción.' };
    }

    const previewProfiles: ImportPreviewData['profiles'] = [];

    for (let i = 0; i < rawProfiles.length; i++) {
      const p = rawProfiles[i];
      if (!p || typeof p !== 'object' || !p.name || !Array.isArray(p.sources)) {
        return {
          valid: false,
          profilesCount: 0,
          profiles: [],
          error: `Perfil #${i + 1} no tiene un formato válido (requiere nombre y array de fuentes).`
        };
      }

      previewProfiles.push({
        id: p.id || `IMPORT_${i + 1}`,
        name: String(p.name),
        description: String(p.description || ''),
        sourcesCount: p.sources.length,
        hasVolleyballModule: Boolean(p.volleyballModule?.controlUrl)
      });
    }

    return {
      valid: true,
      version: parsed.version || '1.0',
      exportedAt: parsed.exportedAt || undefined,
      activeProfileId: parsed.activeProfileId || undefined,
      profilesCount: previewProfiles.length,
      profiles: previewProfiles
    };
  } catch (err: any) {
    return {
      valid: false,
      profilesCount: 0,
      profiles: [],
      error: `Archivo JSON corrupto o malformado: ${err?.message || 'Error de parseo'}`
    };
  }
}

/**
 * Creates an automatic local backup before any import/restore operation
 */
export function createLocalBackup(
  currentProfiles: ProductionProfile[],
  currentActiveProfileId: string,
  currentSources: LogicalSource[]
): void {
  const meta = {
    timestamp: new Date().toISOString(),
    profilesCount: currentProfiles.length,
    activeProfileId: currentActiveProfileId
  };

  localStorage.setItem(LOCAL_STORAGE_KEY_BACKUP_PROFILES, JSON.stringify(currentProfiles));
  localStorage.setItem(LOCAL_STORAGE_KEY_BACKUP_ACTIVE_PROFILE, currentActiveProfileId);
  localStorage.setItem(LOCAL_STORAGE_KEY_BACKUP_SOURCES, JSON.stringify(currentSources));
  localStorage.setItem(LOCAL_STORAGE_KEY_BACKUP_META, JSON.stringify(meta));
}

/**
 * Checks if a local backup exists
 */
export function hasLocalBackup(): boolean {
  return Boolean(localStorage.getItem(LOCAL_STORAGE_KEY_BACKUP_META));
}

/**
 * Gets metadata of the last backup
 */
export function getBackupMetadata(): { timestamp: string; profilesCount: number; activeProfileId: string } | null {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY_BACKUP_META);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Restores the last local backup
 */
export function restoreLocalBackup(): {
  success: boolean;
  profiles?: ProductionProfile[];
  activeProfileId?: string;
  sources?: LogicalSource[];
  log: RecoveryOperationLog;
} {
  const meta = getBackupMetadata();
  const rawProfiles = localStorage.getItem(LOCAL_STORAGE_KEY_BACKUP_PROFILES);
  const activeProfId = localStorage.getItem(LOCAL_STORAGE_KEY_BACKUP_ACTIVE_PROFILE);
  const rawSources = localStorage.getItem(LOCAL_STORAGE_KEY_BACKUP_SOURCES);

  if (!meta || !rawProfiles) {
    const log: RecoveryOperationLog = {
      timestamp: new Date().toISOString(),
      type: 'RESTORE_BACKUP',
      status: 'ERROR',
      details: 'No existe ninguna copia de recuperación previa en este navegador.'
    };
    saveLastOperationLog(log);
    return { success: false, log };
  }

  try {
    const profiles = JSON.parse(rawProfiles);
    const sources = rawSources ? JSON.parse(rawSources) : undefined;
    const activeId = activeProfId || profiles[0]?.id || 'LAB_CURRENT';

    const log: RecoveryOperationLog = {
      timestamp: new Date().toISOString(),
      type: 'RESTORE_BACKUP',
      status: 'SUCCESS',
      details: `Restaurada copia de respaldo local del ${new Date(meta.timestamp).toLocaleString()} (${profiles.length} perfiles)`
    };
    saveLastOperationLog(log);

    return {
      success: true,
      profiles,
      activeProfileId: activeId,
      sources,
      log
    };
  } catch (err: any) {
    const log: RecoveryOperationLog = {
      timestamp: new Date().toISOString(),
      type: 'RESTORE_BACKUP',
      status: 'ERROR',
      details: `Error al restaurar copia: ${err?.message}`
    };
    saveLastOperationLog(log);
    return { success: false, log };
  }
}

/**
 * Saves last recovery operation log to localStorage
 */
function saveLastOperationLog(log: RecoveryOperationLog): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_RECOVERY_LOG, JSON.stringify(log));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Gets last recovery operation log
 */
export function getLastOperationLog(): RecoveryOperationLog | null {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY_RECOVERY_LOG);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}
