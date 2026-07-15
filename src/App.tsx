import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { obtenerConfig } from './db/config';
import { BottomNav, type Tab } from './components/BottomNav';
import { Logo } from './components/Logo';
import { Onboarding } from './features/onboarding/Onboarding';
import { Fichar } from './features/fichar/Fichar';
import { Agenda } from './features/agenda/Agenda';
import { Stats } from './features/stats/Stats';
import { Barberia } from './features/duenio/Barberia';
import { Ajustes } from './features/ajustes/Ajustes';
import { Reservar } from './features/reservar/Reservar';
import type { Config } from './db/types';

/** Ruta por hash: "#/reservar" es la página pública para clientes. */
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

  // Cargando la config (un instante, ya viene seedeada desde main.tsx).
  if (config === undefined) return <Splash />;

  // Página pública de reservas: sin nav, pensada para el cliente.
  if (hash.startsWith('#/reservar')) return <Reservar />;

  if (!config.onboardingCompletado) return <Onboarding />;

  return <AppShell config={config} />;
}

function AppShell({ config }: { config: Config }) {
  const [tab, setTab] = useState<Tab>('fichar');

  return (
    <div className="min-h-full">
      {tab === 'fichar' && <Fichar config={config} />}
      {tab === 'agenda' && <Agenda config={config} />}
      {tab === 'stats' && <Stats config={config} />}
      {tab === 'barberia' && config.esDuenio && <Barberia config={config} />}
      {tab === 'ajustes' && <Ajustes config={config} />}

      <BottomNav activa={tab} onCambiar={setTab} esDuenio={config.esDuenio} />
    </div>
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
