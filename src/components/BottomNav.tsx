import {
  IconoCalendario,
  IconoClientes,
  IconoLocal,
  IconoProducto,
  IconoStats,
  IconoTijera,
} from './Iconos';

export type Tab = 'fichar' | 'agenda' | 'clientes' | 'stock' | 'stats' | 'barberia';

const TABS: { id: Tab; label: string; Icono: typeof IconoTijera; soloDuenio?: boolean }[] = [
  { id: 'fichar', label: 'Fichar', Icono: IconoTijera },
  { id: 'agenda', label: 'Agenda', Icono: IconoCalendario },
  { id: 'clientes', label: 'Clientes', Icono: IconoClientes },
  { id: 'stock', label: 'Stock', Icono: IconoProducto },
  { id: 'stats', label: 'Stats', Icono: IconoStats },
  { id: 'barberia', label: 'Barbería', Icono: IconoLocal, soloDuenio: true },
];

interface Props {
  activa: Tab;
  onCambiar: (tab: Tab) => void;
  esDuenio: boolean;
}

export function BottomNav({ activa, onCambiar, esDuenio }: Props) {
  const tabs = TABS.filter((t) => !t.soloDuenio || esDuenio);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-carbon/10 bg-white/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-md">
        {tabs.map(({ id, label, Icono }) => {
          const activo = id === activa;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onCambiar(id)}
              aria-current={activo ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
                activo ? 'text-carbon' : 'text-carbon-900/40'
              }`}
            >
              <Icono filled={activo} width={26} height={26} />
              <span className={`text-xs ${activo ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
