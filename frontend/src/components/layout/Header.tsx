import React from 'react';
import type { SwitcherStore } from '../../store/useSwitcherStore';
import { Radio, MonitorCheck, RotateCcw } from 'lucide-react';

interface HeaderProps {
  store: SwitcherStore;
}

export const Header: React.FC<HeaderProps> = ({ store }) => {
  const {
    programSourceId,
    previewSourceId,
    logicalSources,
    lastBridgeData,
    resetToDefaults
  } = store;

  const pgmSource = logicalSources.find(s => s.id === programSourceId);
  const pvwSource = logicalSources.find(s => s.id === previewSourceId);

  const atemOk = Boolean(lastBridgeData?.atemConnected);
  const obsOk = Boolean(lastBridgeData?.obsConnected);
  const resOk = Boolean(lastBridgeData?.resolumeConnected);
  const dlOk = Boolean(lastBridgeData?.decklinkConnected);
  const trkOk = Boolean(lastBridgeData?.truckConnected);

  return (
    <header className="bg-slate-950 border-b border-slate-800/80 px-4 py-2 sticky top-0 z-50 flex items-center justify-between gap-4 h-12">
      {/* Brand & Subsystem Badges */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-red-600 via-rose-600 to-amber-500 flex items-center justify-center">
            <Radio className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white font-['Outfit']">
            PIXEL
          </span>
        </div>

        {/* 5 Subsystem Health Pills */}
        <div className="hidden lg:flex items-center gap-1.5 font-mono text-[10px] font-bold">
          <span className={`px-2 py-0.5 rounded border ${atemOk ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
            ATEM {atemOk ? 'CONNECTED' : 'OFFLINE'}
          </span>
          <span className={`px-2 py-0.5 rounded border ${obsOk ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
            OBS {obsOk ? 'CONNECTED' : 'OFFLINE'}
          </span>
          <span className={`px-2 py-0.5 rounded border ${resOk ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
            RESOLUME {resOk ? 'CONNECTED' : 'OFFLINE'}
          </span>
          <span className={`px-2 py-0.5 rounded border ${dlOk ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
            DECKLINK {dlOk ? 'CONNECTED' : 'OFFLINE'}
          </span>
          <span className={`px-2 py-0.5 rounded border ${trkOk ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
            TRUCK {trkOk ? 'CONNECTED' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Program & Preview Center Badges */}
      <div className="flex items-center gap-3 text-xs font-mono">
        <div className="flex items-center gap-1.5 bg-red-950/60 border border-red-500/30 px-2.5 py-1 rounded">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 font-extrabold">PGM:</span>
          <span className="text-white font-bold max-w-[140px] sm:max-w-[200px] truncate">
            {lastBridgeData?.program?.name || pgmSource?.name || 'N/A'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-emerald-400 font-extrabold">PVW:</span>
          <span className="text-white font-bold max-w-[140px] sm:max-w-[200px] truncate">
            {lastBridgeData?.preview?.name || pvwSource?.name || 'N/A'}
          </span>
        </div>
      </div>

      {/* Reset Action */}
      <div className="flex items-center gap-2">
        <button
          onClick={resetToDefaults}
          title="Restablecer fuentes verificadas"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded border border-slate-800 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
