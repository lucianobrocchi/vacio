import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { cortesDelDia } from '../../db/cortes';
import { listarBarberos } from '../../db/barberos';
import { totales } from '../../lib/stats';
import { claveDia, formatFechaLarga, formatHora } from '../../lib/fecha';
import { formatPesos } from '../../lib/format';
import { Pantalla } from '../../components/Pantalla';
import { BarberoChips } from '../../components/BarberoChips';
import { IconoMas, IconoTijera } from '../../components/Iconos';
import { FicharSheet } from './FicharSheet';
import type { Config, Corte } from '../../db/types';
import { copy } from './fichar.copy';

export function Fichar({ config }: { config: Config }) {
  const [barberoUuid, setBarberoUuid] = useState(config.barberoActivoUuid);
  const [sheetAbierto, setSheetAbierto] = useState(false);
  const [corteEditando, setCorteEditando] = useState<Corte | undefined>();

  const hoy = claveDia();
  const barberos = useLiveQuery(() => listarBarberos(), []) ?? [];
  const cortes = useLiveQuery(() => cortesDelDia(hoy, barberoUuid), [hoy, barberoUuid]);

  const t = totales(cortes ?? []);

  function abrirNuevo() {
    setCorteEditando(undefined);
    setSheetAbierto(true);
  }

  function abrirEditar(corte: Corte) {
    setCorteEditando(corte);
    setSheetAbierto(true);
  }

  return (
    <Pantalla titulo={copy.titulo} subtitulo={formatFechaLarga()}>
      <BarberoChips barberos={barberos} activoUuid={barberoUuid} onCambiar={setBarberoUuid} />

      {/* Resumen del día */}
      <div className="card mb-4 p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold text-carbon-900/50">{copy.hoy.cortes(t.cortes)}</p>
            <p className="num text-4xl font-extrabold">{formatPesos(t.facturado)}</p>
          </div>
          <div className="text-right text-sm text-carbon-900/60">
            <p className="num">
              {copy.hoy.efectivo} {formatPesos(t.efectivo)}
            </p>
            <p className="num">
              {copy.hoy.transferencia} {formatPesos(t.transferencia)}
            </p>
          </div>
        </div>
      </div>

      <button type="button" className="btn-primario mb-5" onClick={abrirNuevo}>
        <IconoMas width={22} height={22} />
        {copy.ficharCorte}
      </button>

      {/* Cortes del día */}
      {cortes && cortes.length === 0 && (
        <div className="card flex flex-col items-center gap-2 p-8 text-center">
          <IconoTijera width={36} height={36} className="text-carbon-900/25" />
          <p className="font-semibold">{copy.vacio.titulo}</p>
          <p className="text-sm text-carbon-900/50">{copy.vacio.bajada}</p>
        </div>
      )}

      <ul className="space-y-2">
        {(cortes ?? []).map((corte) => (
          <li key={corte.uuid}>
            <button
              type="button"
              onClick={() => abrirEditar(corte)}
              className="card flex w-full items-center gap-3 p-4 text-left transition active:scale-[0.99]"
            >
              <span className="num w-12 shrink-0 text-lg font-bold">{formatHora(corte.fecha)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{corte.servicioNombre}</span>
                {corte.clienteNombre && (
                  <span className="block truncate text-sm text-carbon-900/50">
                    {corte.clienteNombre}
                  </span>
                )}
              </span>
              <span className="text-right">
                <span className="num block font-bold">{formatPesos(corte.precio)}</span>
                <span className="block text-xs text-carbon-900/40">
                  {corte.medioPago === 'efectivo' ? copy.hoy.efectivo : copy.hoy.transferencia}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <FicharSheet
        abierto={sheetAbierto}
        onCerrar={() => setSheetAbierto(false)}
        barberoUuid={barberoUuid}
        corte={corteEditando}
      />
    </Pantalla>
  );
}
