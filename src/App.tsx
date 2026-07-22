import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { obtenerConfig } from './db/config';
import { BottomNav, type Tab } from './components/BottomNav';
import { AbrirAjustesContext } from './components/contexto';
import { Logo } from './components/Logo';
import { Onboarding } from './features/onboarding/Onboarding';
import { Fichar } from './features/fichar/Fichar';
import { Agenda } from './features/agenda/Agenda';
import { Clientes } from './features/clientes/Clientes';
import { Stats } from './features/stats/Stats';
import { Barberia } from './features/duenio/Barberia';
import { Ajustes } from './features/ajustes/Ajustes';
import { Reservar } from './features/reservar/Reservar';
import { AsistenteBurbuja } from './components/AsistenteBurbuja';
import type { Config } from './db/types';

/** Ruta por hash: "#/reservar" (cliente) y "#/admin" (panel del dueño de la app). */
function useHashRoute(): string {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const onChange = () => setHash(location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export default function App() {
  const config = useLiveQuery(() => obtenerConfig());
  const hash = useHashRoute();

  // Página pública de reservas: sin nav, pensada para el cliente. No depende de config.
  if (hash.startsWith('#/reservar')) return <Reservar />;

  // Cargando la config (un instante, ya viene seedeada desde main.tsx).
  if (config === undefined) return <Splash />;

  if (!config.onboardingCompletado) return <Onboarding />;

  return <AppShell config={config} />;
}

function AppShell({ config }: { config: Config }) {
  const [tab, setTab] = useState<Tab>('fichar');
  const [ajustesAbierto, setAjustesAbierto] = useState(false);

  // Ajustes se abre desde el engranaje del header (sub-página a pantalla completa).
  if (ajustesAbierto) {
    return (
      <div className="min-h-full">
        <Ajustes config={config} onCerrar={() => setAjustesAbierto(false)} />
      </div>
    );
  }

  return (
    <AbrirAjustesContext.Provider value={() => setAjustesAbierto(true)}>
      <div className="min-h-full">
        {tab === 'fichar' && <Fichar config={config} />}
        {tab === 'agenda' && <Agenda config={config} />}
        {tab === 'clientes' && <Clientes config={config} />}
        {tab === 'stats' && <Stats config={config} />}
        {tab === 'barberia' && config.esDuenio && <Barberia config={config} />}

        <AsistenteBurbuja config={config} />
        <BottomNav activa={tab} onCambiar={setTab} esDuenio={config.esDuenio} />
      </div>
    </AbrirAjustesContext.Provider>
  );
}

function Splash() {
  return (
    <div className="flex min-h-full items-center justify-center bg-carbon-50">
      <div className="animate-pop">
        <Logo />
      </div>
    </div>
  );
}
