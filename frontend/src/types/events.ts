export type DirectionEventType = 'PREVIEW' | 'PROGRAM';

export interface DirectionEvent {
  id: string;
  timestamp: string;      // e.g. "12:19:25"
  isoTime: string;        // e.g. "2026-08-11T12:19:25.000Z"
  type: DirectionEventType;
  previousSource: string; // e.g. "CAM_1"
  newSource: string;      // e.g. "CAM_2"
}
