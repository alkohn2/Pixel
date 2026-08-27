import type { LogicalSource, PhysicalInput } from './sources';

export type TallyState = 'PROGRAM' | 'PREVIEW' | 'OFF';

export type ActiveTab = 'multiviewer' | 'events' | 'configuration' | 'replay' | 'volleyball' | 'preflight' | 'setup';

export type MultiviewMode = 'OPERATIONS' | 'VISUAL';

export interface SwitcherState {
  programSourceId: string;
  previewSourceId: string;
  logicalSources: LogicalSource[];
  physicalInputs: PhysicalInput[];
  activeTab: ActiveTab;
  multiviewMode?: MultiviewMode;
  isSimulatingSignalLoss?: boolean;
}
