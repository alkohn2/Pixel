export type ReplayPriority = 'normal' | 'high';

export interface ReplayMarker {
  id: string;
  eventId: string;
  timestamp: string;      // e.g. "13:28:25"
  isoTime: string;
  onAirSource: string;     // e.g. "CAM_2"
  previousSource: string; // e.g. "CAM_1"
  priority: ReplayPriority;
  note: string;            // e.g. "Bloqueo decisivo en la red"
}
