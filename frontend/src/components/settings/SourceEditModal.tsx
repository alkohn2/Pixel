import React, { useState } from 'react';
import type { LogicalSource, PhysicalInput } from '../../types/sources';
import { X, Save, Sparkles } from 'lucide-react';

interface SourceEditModalProps {
  source: LogicalSource | null;
  physicalInputs: PhysicalInput[];
  onSave: (updated: LogicalSource) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#3B82F6',
  '#06B6D4',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#EF4444',
  '#10B981',
  '#6B7280'
];

export const SourceEditModal: React.FC<SourceEditModalProps> = ({
  source,
  physicalInputs,
  onSave,
  onClose
}) => {
  const isEditing = Boolean(source?.id);

  const [id] = useState(source?.id || `source-${Date.now()}`);
  const [positionIndex] = useState(source?.positionIndex || 1);
  const [name, setName] = useState(source?.name || '');
  const [shortLabel, setShortLabel] = useState(source?.shortLabel || '');
  const [physicalInputId, setPhysicalInputId] = useState(source?.physicalInputId || physicalInputs[0]?.id || 'input-1');
  const [color, setColor] = useState(source?.color || PRESET_COLORS[0]);
  const [description, setDescription] = useState(source?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !shortLabel.trim()) {
      alert('Por favor completa el nombre y la etiqueta corta.');
      return;
    }

    onSave({
      id,
      positionIndex,
      name,
      shortLabel: shortLabel.toUpperCase(),
      physicalInputId,
      color,
      iconName: source?.iconName || 'Camera',
      status: physicalInputId === 'unassigned' ? 'unassigned' : 'assigned',
      description
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="font-extrabold text-base text-white font-['Outfit']">
              {isEditing ? 'Editar Fuente Lógica' : 'Nueva Fuente Lógica'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Nombre Completo de Producción
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Cámara 5 - Grua Detrás de Portería"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Etiqueta Corta (Tally)
              </label>
              <input
                type="text"
                maxLength={6}
                value={shortLabel}
                onChange={e => setShortLabel(e.target.value.toUpperCase())}
                placeholder="Ej: CAM 5"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono uppercase font-extrabold focus:outline-none focus:border-purple-500"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">Máximo 6 caracteres</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Entrada Física Asignada
              </label>
              <select
                value={physicalInputId}
                onChange={e => setPhysicalInputId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
              >
                {physicalInputs.map(input => (
                  <option key={input.id} value={input.id}>
                    {input.name} ({input.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
              Color de Identificación
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition cursor-pointer ${
                    color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Notas / Ubicación de Operador
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ubicación física del operador, rol táctico o notas..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs px-5 py-2 rounded-lg shadow-lg shadow-purple-950/50 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Guardar Configuración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
