import { claveDia, desdeClave, formatDiaCorto, sumarDias } from '../../lib/fecha';

interface Props {
  dia: string;
  onCambiar: (dia: string) => void;
  /** Cuántos días hacia adelante mostrar. */
  dias?: number;
}

/** Tira horizontal de días, desde hoy. */
export function TiraDias({ dia, onCambiar, dias = 14 }: Props) {
  const hoy = claveDia();
  const lista = Array.from({ length: dias }, (_, i) => sumarDias(hoy, i));

  return (
    <div className="sin-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
      {lista.map((d) => {
        const activo = d === dia;
        const numero = desdeClave(d).getDate();
        return (
          <button
            key={d}
            type="button"
            onClick={() => onCambiar(d)}
            className={`flex w-14 shrink-0 flex-col items-center rounded-2xl border-2 py-2 transition ${
              activo ? 'border-carbon bg-carbon text-white' : 'border-carbon/15 bg-white'
            }`}
          >
            <span className={`text-xs font-medium ${activo ? 'text-white/70' : 'text-carbon-900/50'}`}>
              {d === hoy ? 'hoy' : formatDiaCorto(d)}
            </span>
            <span className="num text-lg font-bold">{numero}</span>
          </button>
        );
      })}
    </div>
  );
}
