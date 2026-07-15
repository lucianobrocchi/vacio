import { useEffect, useState } from 'react';
import { crearBloqueo } from '../../db/bloqueos';
import { desdeClave, formatFechaLarga, horaAMin, minAHora } from '../../lib/fecha';
import { Sheet } from '../../components/Sheet';
import { Campo } from '../../components/Campo';
import type { Config } from '../../db/types';
import { copy } from './agenda.copy';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  config: Config;
  dia: string;
  barberoUuid: string;
}

const c = copy.bloqueoSheet;

export function BloqueoSheet({ abierto, onCerrar, config, dia, barberoUuid }: Props) {
  const horario = config.horario[desdeClave(dia).getDay()];

  // Opciones cada 30 min dentro del horario del día (o 9-20 si está cerrado).
  const abre = horario.cerrado ? 9 * 60 : horaAMin(horario.abre);
  const cierra = horario.cerrado ? 20 * 60 : horaAMin(horario.cierra);
  const opciones: string[] = [];
  for (let m = abre; m <= cierra; m += 30) opciones.push(minAHora(m));

  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (!abierto) return;
    setDesde(opciones[0] ?? '09:00');
    setHasta(opciones[Math.min(4, opciones.length - 1)] ?? '11:00');
    setMotivo('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, dia]);

  const rangoValido = horaAMin(hasta) > horaAMin(desde);

  async function guardar() {
    if (!rangoValido) return;
    await crearBloqueo({ dia, desde, hasta, motivo: motivo.trim() || undefined, barberoUuid });
    onCerrar();
  }

  const selectClase = 'input-texto num appearance-none py-3';

  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} titulo={`${c.titulo} · ${formatFechaLarga(dia)}`}>
      <div className="space-y-4">
        <p className="text-sm text-carbon-900/60">{c.bajada}</p>

        <div className="grid grid-cols-2 gap-3">
          <Campo label={c.desde}>
            <select className={selectClase} value={desde} onChange={(e) => setDesde(e.target.value)}>
              {opciones.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label={c.hasta}>
            <select className={selectClase} value={hasta} onChange={(e) => setHasta(e.target.value)}>
              {opciones.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <Campo label={c.motivo}>
          <input
            className="input-texto"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={c.motivoPlaceholder}
          />
        </Campo>

        {!rangoValido && <p className="text-sm font-semibold text-rojo">{c.rangoInvalido}</p>}

        <button type="button" className="btn-primario" disabled={!rangoValido} onClick={guardar}>
          {c.guardar}
        </button>
      </div>
    </Sheet>
  );
}
