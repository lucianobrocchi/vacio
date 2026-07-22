import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { obtenerConfig, actualizarConfig } from './db/config';
import { chequearLicencia, respaldarAhora, type EstadoNube } from './lib/nube';
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
import { Membresia } from './features/nube/Membresia';
import { Admin } from './features/admin/Admin';
import { AsistenteBurbuja } from './components/AsistenteBurbuja';
import type { Config } from './db/types';

/** Ruta por hash: "#/reservar" (cliente) y "#/admin" (dueño de la app). */
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
  const [licencia, setLicencia] = useState<EstadoNube | null>(null);
  const [desbloqueada, setDesbloqueada] = useState(false);

  const listo = config !== undefined;
  const codigo = config?.licenciaCodigo;

  // Chequeo de licencia + heartbeat (cada 10 min). Nunca bloquea offline.
  useEffect(() => {
    if (!listo) return;
    let cancel = false;
    const check = async () => {
      const e = await chequearLicencia(codigo);
      if (cancel) return;
      setLicencia(e);
      if (e.estado) actualizarConfig({ licenciaEstado: e.estado });
    };
    check();
    const id = setInterval(check, 10 * 60 * 1000);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, [listo, codigo]);

  // Auto-respaldo en la nube cuando la licencia está activa.
  useEffect(() => {
    if (!licencia?.activada || !codigo) return;
    respaldarAhora(codigo);
    const id = setInterval(() => respaldarAhora(codigo), 20 * 60 * 1000);
    return () => clearInterval(id);
  }, [licencia?.activada, codigo]);

  // Página pública de reservas (cliente) y panel admin (Luciano): sin gate.
  if (hash.startsWith('#/reservar')) return <Reservar />;
  if (hash.startsWith('#/admin')) return <Admin />;

  if (config === undefined) return <Splash />;

  // Gate de membresía: solo si la nube está activa y este equipo no tiene licencia válida.
  const bloqueado = !!licencia?.cloud && !licencia.activada && !desbloqueada;
  if (bloqueado) return <Membresia estado={licencia!} onActiva={() => setDesbloqueada(true)} />;

  if (!config.onboardingCompletado) return <Onboarding />;

  return <AppShell config={config} />;
}

function AppShell({ config }: { config: Config }) {
  const [tab, setTab] = useState<Tab>('fichar');
  const [ajustesAbierto, setAjustesAbierto] = useState(false);

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
