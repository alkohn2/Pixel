import React from 'react';
import type { SwitcherStore } from '../../store/useSwitcherStore';
import { SourceCard } from './SourceCard';

interface MultiviewGridProps {
  store: SwitcherStore;
}

export const MultiviewGrid: React.FC<MultiviewGridProps> = ({ store }) => {
  const {
    logicalSources,
    physicalInputs,
    lastBridgeData,
    programSourceId,
    previewSourceId,
    setProgramSource,
    setPreviewSource
  } = store;

  // DeckLink channels map from Production Bridge
  const decklinkChannels = lastBridgeData?.decklink?.channels;

  // Helper to find source by candidate names or position index
  const findSource = (names: string[], fallbackIndex: number) => {
    for (const name of names) {
      const match = logicalSources.find(
        s => s.name.toUpperCase() === name.toUpperCase() || s.shortLabel.toUpperCase() === name.toUpperCase()
      );
      if (match) return match;
    }
    return logicalSources[fallbackIndex] || null;
  };

  // OFFICIAL PIXEL VISUAL ROUTING RULE:
  // TOP ROW (SDI / BNC): 1. CAM_MAIN, 2. RESOLUME, 3. OBS, 4. TRUCK_PGM / TRUCK
  // BOTTOM ROW (HDMI):    5. CAM_1, 6. CAM_2, 7. CAM_3, 8. COMPUTER
  const sdiSources = [
    findSource(['CAM_MAIN', 'MAIN_CAM'], 1),
    findSource(['RESOLUME', 'RES'], 6),
    findSource(['OBS'], 4),
    findSource(['TRUCK_PGM', 'TRUCK', 'TRUCK PGM'], 5)
  ];

  const hdmiSources = [
    findSource(['CAM_1', 'CAM1'], 0),
    findSource(['CAM_2', 'CAM2'], 1),
    findSource(['CAM_3', 'CAM3'], 2),
    findSource(['COMPUTER', 'COMP', 'PC'], 3)
  ];

  const all8Sources = [...sdiSources, ...hdmiSources];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: '1fr 1fr',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '2px',
        width: '100%',
        height: '100%',
        minHeight: 0,
        backgroundColor: '#000000',
        boxSizing: 'border-box'
      }}
    >
      {all8Sources.map((source, idx) => {
        if (!source) {
          return (
            <div
              key={`empty-${idx}`}
              style={{
                backgroundColor: '#070a12',
                borderRadius: '3px',
                border: '1px solid #1e293b',
                minHeight: 0
              }}
            />
          );
        }

        const physicalInput = physicalInputs.find(i => i.id === source.physicalInputId);
        const isProgram = source.id === programSourceId;
        const isPreview = source.id === previewSourceId;

        return (
          <div key={source.id} style={{ width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>
            <SourceCard
              source={source}
              physicalInput={physicalInput}
              decklinkChannels={decklinkChannels}
              isProgram={isProgram}
              isPreview={isPreview}
              onSelectProgram={() => setProgramSource(source.id)}
              onSelectPreview={() => setPreviewSource(source.id)}
            />
          </div>
        );
      })}
    </div>
  );
};
