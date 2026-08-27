import type { LogicalSource, PhysicalSignalMapping } from './sources';

export interface ExternalModuleConfig {
  name: string;        // e.g. 'Volleyball Control2'
  controlUrl: string;  // e.g. 'http://127.0.0.1:8080/control.html'
  overlayUrl: string;  // e.g. 'http://127.0.0.1:8080/overlay.html'
}

export interface EventSelectedModules {
  cameras: boolean;
  truck: boolean;
  obs: boolean;
  resolume: boolean;
  volleyball: boolean;
}

export interface ProductionProfile {
  id: string;
  name: string;
  description: string;
  isBuiltin?: boolean;
  updatedAt: string;
  sources: LogicalSource[]; // Array of 8 fixed visual position sources
  volleyballModule?: ExternalModuleConfig;
  physicalSignalMap?: PhysicalSignalMapping[]; // 4-layer physical signal mapping matrix
  // Event Quick Setup Metadata
  eventName?: string;
  sport?: string;
  eventDate?: string;
  selectedModules?: EventSelectedModules;
  eventPreparationSaved?: boolean;
}
