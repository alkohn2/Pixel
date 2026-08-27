import React from 'react';
import type { SwitcherStore } from '../../store/useSwitcherStore';
import { SimulatedVideoFeed } from '../video/SimulatedVideoFeed';

interface ProgramPreviewMonitorsProps {
  store: SwitcherStore;
}

export const ProgramPreviewMonitors: React.FC<ProgramPreviewMonitorsProps> = ({ store }) => {
  const {
    programSourceId,
    previewSourceId,
    logicalSources,
    physicalInputs,
    cutSwitch,
    lastBridgeData
  } = store;

  const pgmSource = logicalSources.find(s => s.id === programSourceId);
  const pvwSource = logicalSources.find(s => s.id === previewSourceId);

  const pgmInput = physicalInputs.find(i => i.id === pgmSource?.physicalInputId);
  const pvwInput = physicalInputs.find(i => i.id === pvwSource?.physicalInputId);

  // Exact names received from Bridge or Store fallback
  const pvwName = lastBridgeData?.preview?.name || pvwSource?.name || 'CAM_2';
  const pgmName = lastBridgeData?.program?.name || pgmSource?.name || 'OBS';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2px',
        width: '100%',
        height: '100%',
        backgroundColor: '#000000'
      }}
    >
      {/* TOP LEFT: PREVIEW MONITOR (PREVIEW · [NOMBRE]) */}
      <div
        onClick={cutSwitch}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          border: '3px solid #00e676',
          boxShadow: '0 0 12px rgba(0, 230, 118, 0.4)',
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: '#05070a',
          cursor: 'pointer'
        }}
        title="Clic para conmutar Preview / Program (CUT)"
      >
        {/* Prominent Visible Header Badge: PREVIEW · [NOMBRE] */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '12px',
            zIndex: 40,
            backgroundColor: 'rgba(0, 230, 118, 0.95)',
            color: '#022c22',
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 'bold',
            fontSize: '13px',
            padding: '3px 10px',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
            letterSpacing: '0.5px'
          }}
        >
          PREVIEW · {pvwName}
        </div>

        {pvwSource ? (
          <SimulatedVideoFeed
            source={pvwSource}
            physicalInput={pvwInput}
            isPreview={true}
            customLabel={`PREVIEW · ${pvwName}`}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px', fontFamily: 'monospace' }}>
            PREVIEW · {pvwName}
          </div>
        )}
      </div>

      {/* TOP RIGHT: PROGRAM MONITOR (PROGRAM · [NOMBRE]) */}
      <div
        onClick={cutSwitch}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          border: '3px solid #ff2a4d',
          boxShadow: '0 0 12px rgba(255, 42, 77, 0.4)',
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: '#05070a',
          cursor: 'pointer'
        }}
        title="Clic para conmutar Preview / Program (CUT)"
      >
        {/* Prominent Visible Header Badge: PROGRAM · [NOMBRE] */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '12px',
            zIndex: 40,
            backgroundColor: 'rgba(255, 42, 77, 0.95)',
            color: '#ffffff',
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 'bold',
            fontSize: '13px',
            padding: '3px 10px',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
            letterSpacing: '0.5px'
          }}
        >
          PROGRAM · {pgmName}
        </div>

        {pgmSource ? (
          <SimulatedVideoFeed
            source={pgmSource}
            physicalInput={pgmInput}
            isProgram={true}
            customLabel={`PROGRAM · ${pgmName}`}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px', fontFamily: 'monospace' }}>
            PROGRAM · {pgmName}
          </div>
        )}
      </div>
    </div>
  );
};
