import React, { useEffect, useRef } from 'react';
import type { LogicalSource, PhysicalInput } from '../../types/sources';
import { getDeckLinkSignalState } from '../../types/sources';
import type { DeckLinkChannelStatus } from '../../services/bridgeClient';

interface SimulatedVideoFeedProps {
  source: LogicalSource;
  physicalInput?: PhysicalInput;
  decklinkChannels?: Record<string, DeckLinkChannelStatus>;
  isProgram?: boolean;
  isPreview?: boolean;
  customLabel?: string;
  showOverlay?: boolean;
}

export const SimulatedVideoFeed: React.FC<SimulatedVideoFeedProps> = ({
  source,
  physicalInput,
  decklinkChannels,
  isProgram = false,
  isPreview = false,
  customLabel,
  showOverlay = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const decklinkInfo = getDeckLinkSignalState(source.physicalInputId, decklinkChannels);
  const isUnassigned = source.name === 'Sin asignar' || source.physicalInputId === 'unassigned';
  const isNoSignal = decklinkInfo.state === 'no_signal';

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const resizeCanvas = () => {
      const w = container.clientWidth || container.offsetWidth || 480;
      const h = container.clientHeight || container.offsetHeight || 270;
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = () => {
      frame++;
      const width = canvas.width || 480;
      const height = canvas.height || 270;

      ctx.clearRect(0, 0, width, height);

      if (isUnassigned || isNoSignal) {
        // Dark card for unassigned feeds or explicit NO SIGNAL
        ctx.fillStyle = '#06090e';
        ctx.fillRect(0, 0, width, height);

        const imgData = ctx.createImageData(width, height);
        for (let i = 0; i < imgData.data.length; i += 4) {
          const noise = Math.floor(Math.random() * (isNoSignal ? 24 : 12));
          imgData.data[i] = isNoSignal ? noise + 10 : noise;
          imgData.data[i + 1] = noise;
          imgData.data[i + 2] = noise;
          imgData.data[i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);

        if (isNoSignal) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
          ctx.fillRect(0, 0, width, height);
        }

        animId = requestAnimationFrame(render);
        return;
      }

      const sourceName = source.name.toUpperCase();

      if (sourceName.includes('COMPUTER')) {
        const time = frame * 0.02;
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#0b1329');
        grad.addColorStop(0.5, '#1e293b');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.fillRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);

        const curX = width * 0.4 + Math.sin(time) * (width * 0.2);
        const curY = height * 0.4 + Math.cos(time * 0.7) * (height * 0.2);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(curX, curY, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (sourceName.includes('CAM_2')) {
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#b45309';
        ctx.fillRect(width * 0.1, height * 0.15, width * 0.8, height * 0.75);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(width * 0.15, height * 0.2, width * 0.7, height * 0.65);
        ctx.beginPath();
        ctx.moveTo(width / 2, height * 0.2); ctx.lineTo(width / 2, height * 0.85);
        ctx.stroke();

        const bX = (width / 2) + Math.sin(frame * 0.05) * (width * 0.25);
        const bY = (height / 2) + Math.cos(frame * 0.06) * (height * 0.2);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.arc(bX, bY, 7, 0, Math.PI * 2); ctx.fill();
      } else if (sourceName.includes('CAM_1') || sourceName.includes('CAM_3') || sourceName.includes('CAM_4')) {
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);

        const bX = (width / 2) + Math.cos(frame * 0.04) * (width * 0.3);
        const bY = (height / 2) + Math.sin(frame * 0.04) * (height * 0.2);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath(); ctx.arc(bX, bY, 5, 0, Math.PI * 2); ctx.fill();
      } else if (sourceName.includes('OBS')) {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, width, height);

        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, width - 20, height - 20);
      } else if (sourceName.includes('TRUCK')) {
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, width - 20, height - 20);

        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(25, 25, 5, 0, Math.PI * 2); ctx.fill();
      } else if (sourceName.includes('RESOLUME')) {
        const time = frame * 0.03;
        const grad = ctx.createRadialGradient(width/2, height/2, 10, width/2, height/2, width*0.6);
        grad.addColorStop(0, '#818cf8');
        grad.addColorStop(0.5, '#4f46e5');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(time);
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 3;
        ctx.strokeRect(-35, -35, 70, 70);
        ctx.restore();
      } else {
        ctx.fillStyle = '#0d131f';
        ctx.fillRect(0, 0, width, height);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animId);
    };
  }, [source, physicalInput, isUnassigned, isNoSignal]);

  const pillText = customLabel || source.name;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#05070a',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'fill'
        }}
      />

      {/* Top Right Source DeckLink Signal Health Badge (ALWAYS visible on all 8 cells) */}
      {showOverlay && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            zIndex: 35,
            pointerEvents: 'none'
          }}
        >
          <span
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              border: `1px solid ${decklinkInfo.badgeColor}`,
              color: decklinkInfo.badgeColor,
              fontSize: '9px',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              padding: '1px 5px',
              borderRadius: '3px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.6)'
            }}
            title={decklinkInfo.details || decklinkInfo.label}
          >
            {decklinkInfo.label}
          </span>
        </div>
      )}

      {/* Exact ATEM Pill Badge (Centered at bottom of feed) */}
      {showOverlay && (
        <div
          style={{
            position: 'absolute',
            bottom: '6px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(11, 15, 25, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              color: '#ffffff',
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 'bold',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.6)',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isProgram && (
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ff2a4d' }} />
            )}
            {isPreview && !isProgram && (
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#00e676' }} />
            )}
            <span>{pillText}</span>
          </div>
        </div>
      )}
    </div>
  );
};
