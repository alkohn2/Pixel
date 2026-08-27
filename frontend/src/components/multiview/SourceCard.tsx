import React from 'react';
import type { LogicalSource, PhysicalInput } from '../../types/sources';
import type { DeckLinkChannelStatus } from '../../services/bridgeClient';
import { SimulatedVideoFeed } from '../video/SimulatedVideoFeed';

interface SourceCardProps {
  source: LogicalSource;
  physicalInput?: PhysicalInput;
  decklinkChannels?: Record<string, DeckLinkChannelStatus>;
  isProgram: boolean;
  isPreview: boolean;
  onSelectProgram: () => void;
  onSelectPreview: () => void;
}

export const SourceCard: React.FC<SourceCardProps> = ({
  source,
  physicalInput,
  decklinkChannels,
  isProgram,
  isPreview,
  onSelectProgram,
  onSelectPreview
}) => {
  return (
    <div
      onClick={onSelectPreview}
      onContextMenu={(e) => {
        e.preventDefault();
        onSelectProgram();
      }}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        border: isProgram
          ? '3px solid #ff2a4d'
          : isPreview
          ? '3px solid #00e676'
          : '1px solid #334155',
        boxShadow: isProgram
          ? '0 0 10px rgba(255, 42, 77, 0.4)'
          : isPreview
          ? '0 0 10px rgba(0, 230, 118, 0.4)'
          : 'none',
        borderRadius: '4px',
        overflow: 'hidden',
        backgroundColor: '#05070a',
        cursor: 'pointer',
        userSelect: 'none'
      }}
      title={`Clic Izquierdo: Cargar a Preview | Clic Derecho: Pasar a Program`}
    >
      <SimulatedVideoFeed
        source={source}
        physicalInput={physicalInput}
        decklinkChannels={decklinkChannels}
        isProgram={isProgram}
        isPreview={isPreview}
        customLabel={source.name}
      />
    </div>
  );
};
