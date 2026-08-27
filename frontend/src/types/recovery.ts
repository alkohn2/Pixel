import type { ProductionProfile } from './profiles';

export interface PixelExportPackage {
  version: '1.0';
  system: 'PIXEL_OPERATIONAL_PROFILES';
  exportedAt: string;
  activeProfileId?: string;
  profiles: ProductionProfile[];
}

export interface ImportPreviewData {
  valid: boolean;
  version?: string;
  exportedAt?: string;
  activeProfileId?: string;
  profilesCount: number;
  profiles: Array<{
    id: string;
    name: string;
    description: string;
    sourcesCount: number;
    hasVolleyballModule: boolean;
  }>;
  error?: string;
}

export interface RecoveryOperationLog {
  timestamp: string;
  type: 'EXPORT_ALL' | 'EXPORT_ACTIVE' | 'IMPORT_REPLACE' | 'IMPORT_MERGE' | 'RESTORE_BACKUP';
  status: 'SUCCESS' | 'ERROR';
  details: string;
}
