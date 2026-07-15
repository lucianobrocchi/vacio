import type { Barbero } from '../db/types';

interface Props {
  barberos: Barbero[];
  activoUuid: string;
  onCambiar: (uuid: string) => void;
  /** Chip extra "Todos" (para el panel del dueño). */
  conTodos?: boolean;
}

/** Chips horizontales para elegir barbero. Se oculta si hay uno solo. */
export function BarberoChips({ barberos, activoUuid, onCambiar, conTodos = false }: Props) {
  if (barberos.length <= 1 && !conTodos) return null;

  const chips = conTodos ? [{ uuid: '', nombre: 'Todos', emoji: '💈' }, ...barberos] : barberos;

  return (
    <div className="sin-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
      {chips.map((b) => {
        const activo = b.uuid === activoUuid;
        return (
          <button
            key={b.uuid || 'todos'}
            type="button"
            onClick={() => onCambiar(b.uuid)}
            className={`shrink-0 rounded-full border-2 px-4 py-2 text-sm font-semibold transition ${
              activo ? 'border-carbon bg-carbon text-white' : 'border-carbon/15 bg-white text-carbon'
            }`}
          >
            {b.emoji ? `${b.emoji} ` : ''}
            {b.nombre}
          </button>
        );
      })}
    </div>
  );
}
