import type { PhysicalInput, LogicalSource } from '../types/sources';

export const INITIAL_PHYSICAL_INPUTS: PhysicalInput[] = [
  { id: 'unassigned', name: 'Ninguna (Sin asignar)', type: 'SDI', resolution: 'Sin señal', status: 'no-signal' },
  { id: 'input-1', name: 'Input 1', type: 'SDI', resolution: '1080p 59.94', status: 'active' },
  { id: 'input-2', name: 'Input 2', type: 'HDMI', resolution: '1080p 60.00', status: 'active' },
  { id: 'input-3', name: 'Input 3', type: 'SDI', resolution: '1080p 59.94', status: 'active' },
  { id: 'input-4', name: 'Input 4', type: 'HDMI', resolution: '1080p 60.00', status: 'active' },
  { id: 'input-5', name: 'Input 5 / BNC 1', type: 'SDI', resolution: '1080p 59.94', status: 'active' },
  { id: 'input-6', name: 'Input 6 / BNC 2', type: 'SDI', resolution: '1080p 60.00', status: 'active' },
  { id: 'input-7', name: 'Input 7 / BNC 3', type: 'SDI', resolution: '1080p 59.94', status: 'active' },
  { id: 'input-8', name: 'Input 8 / BNC 4', type: 'SDI', resolution: '1080p 60.00', status: 'active' },
];

export const INITIAL_LOGICAL_SOURCES: LogicalSource[] = [
  {
    id: 'pos-1',
    positionIndex: 1,
    name: 'CAM_1',
    shortLabel: 'CAM_1',
    physicalInputId: 'unassigned',
    color: '#3B82F6',
    iconName: 'Camera',
    status: 'unassigned',
    description: 'Posición 1: Sin asignar hasta confirmación'
  },
  {
    id: 'pos-2',
    positionIndex: 2,
    name: 'CAM_2',
    shortLabel: 'CAM_2',
    physicalInputId: 'input-5',
    color: '#10B981',
    iconName: 'Camera',
    status: 'assigned',
    description: 'Posición 2: CAM_2 (Input 5 / BNC 1)'
  },
  {
    id: 'pos-3',
    positionIndex: 3,
    name: 'CAM_3',
    shortLabel: 'CAM_3',
    physicalInputId: 'unassigned',
    color: '#8B5CF6',
    iconName: 'Video',
    status: 'unassigned',
    description: 'Posición 3: Sin asignar hasta confirmación'
  },
  {
    id: 'pos-4',
    positionIndex: 4,
    name: 'COMPUTER',
    shortLabel: 'COMPUTER',
    physicalInputId: 'input-2',
    color: '#06B6D4',
    iconName: 'Monitor',
    status: 'assigned',
    description: 'Posición 4: COMPUTER (Input 2)'
  },
  {
    id: 'pos-5',
    positionIndex: 5,
    name: 'OBS',
    shortLabel: 'OBS',
    physicalInputId: 'input-6',
    color: '#F59E0B',
    iconName: 'Radio',
    status: 'assigned',
    description: 'Posición 5: OBS (Input 6 / BNC 2)'
  },
  {
    id: 'pos-6',
    positionIndex: 6,
    name: 'TRUCK',
    shortLabel: 'TRUCK',
    physicalInputId: 'input-7',
    color: '#EF4444',
    iconName: 'Truck',
    status: 'assigned',
    description: 'Posición 6: TRUCK (Input 7 / BNC 3)'
  },
  {
    id: 'pos-7',
    positionIndex: 7,
    name: 'RESOLUME',
    shortLabel: 'RESOLUME',
    physicalInputId: 'input-8',
    color: '#6366F1',
    iconName: 'Sliders',
    status: 'assigned',
    description: 'Posición 7: RESOLUME (Input 8 / BNC 4)'
  },
  {
    id: 'pos-8',
    positionIndex: 8,
    name: 'Sin asignar',
    shortLabel: 'Sin asignar',
    physicalInputId: 'unassigned',
    color: '#64748B',
    iconName: 'AlertCircle',
    status: 'unassigned',
    description: 'Posición 8: Sin asignar'
  }
];
