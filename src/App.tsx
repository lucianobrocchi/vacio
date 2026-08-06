import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { obtenerConfig, actualizarConfig } from './db/config';
import { db } from './db/db';
import { chequearLicencia, respaldarAhora, restaurarDesdeNube, type EstadoNube } from './lib/nube';
import { iniciarSync, syncVivoHabilitado } from './lib/sync';
import { capacidades } from './lib/planes';
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
import { Stock } from './features/stock/Stock';
import { Tienda } from './features/tienda/Tienda';
import { Membresia } from './features/nube/Membresia';
import { Acceso } from './features/acceso/Acceso';
import { Unirse } from './features/acceso/Unirse';
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
  // Puerta explícita: "ya tengo un código" desde el onboarding, por si el
  // gate no llegó a aparecer (sin conexión, versión cacheada, etc.).
  const [pidiendoCodigo, setPidiendoCodigo] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  /** Ya corrió el sync: si igual no hay datos, la nube estaba vacía. */
  const [syncTermino, setSyncTermino] = useState(false);
  const syncRef = useRef(false);

  const listo = config !== undefined;
  const codigo = config?.licenciaCodigo;
  /** Barbería sin equipo: no hay a quién elegir en el acceso. */
  const cuantosBarberos = useLiveQuery(() => db.barberos.count(), []);
  const sinBarberos = cuantosBarberos === 0;

  // Con la licencia activa: arranca el sync en vivo (Modelo B) y, si este
  // teléfono todavía no tiene los datos de la barbería, los baja.
  //
  // El sync en vivo puede no estar disponible (plan sin sync, claves del
  // navegador ausentes, realtime bloqueado). En ese caso caemos al respaldo
  // de la nube, que solo necesita /api/backup. Así el barbero que se suma
  // NUNCA termina en "crear barbería" habiendo datos en la nube.
  useEffect(() => {
    if (syncRef.current || !licencia?.activada || !codigo) return;
    syncRef.current = true;
    (async () => {
      const antes = await obtenerConfig();
      const sinDatos = !antes?.onboardingCompletado;
      const adoptado = localStorage.getItem(`corte.sync.adoptado.${codigo}`) === '1';
      if (sinDatos || !adoptado) setSincronizando(true);

      if (capacidades(licencia.plan).syncVivo && syncVivoHabilitado()) {
        await iniciarSync(codigo).catch(() => undefined);
      }

      // ¿Seguimos sin los datos de la barbería? Probamos con el respaldo.
      const despues = await obtenerConfig();
      if (!despues?.onboardingCompletado) {
        await restaurarDesdeNube(codigo).catch(() => undefined);
      }

      setSincronizando(false);
      setSyncTermino(true);
    })();
  }, [licencia?.activada, licencia?.plan, codigo]);

  // Chequeo de licencia + heartbeat (cada 10 min). Nunca bloquea offline.
  useEffect(() => {
    if (!listo) return;
    let cancel = false;
    const check = async () => {
      const e = await chequearLicencia(codigo);
      if (cancel) return;
      setLicencia(e);
      if (e.estado || e.plan)
        actualizarConfig({
          ...(e.estado ? { licenciaEstado: e.estado } : {}),
          ...(e.plan ? { licenciaPlan: e.plan } : {}),
        });
    };
    check();
    const id = setInterval(check, 10 * 60 * 1000);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, [listo, codigo]);

  // Auto-respaldo en la nube cuando la licencia está activa. Solo si el plan
  // incluye respaldo (pro/full).
  useEffect(() => {
    if (!licencia?.activada || !codigo || !capacidades(licencia.plan).respaldoNube) return;
    respaldarAhora(codigo);
    const id = setInterval(() => respaldarAhora(codigo), 20 * 60 * 1000);
    return () => clearInterval(id);
  }, [licencia?.activada, licencia?.plan, codigo]);

  // Páginas públicas (cliente) y panel admin (Luciano): sin gate.
  if (hash.startsWith('#/reservar')) return <Reservar />;
  if (hash.startsWith('#/tienda')) return <Tienda />;
  if (hash.startsWith('#/unirse')) return <Unirse />;
  if (hash.startsWith('#/admin')) return <Admin />;

  if (config === undefined) return <Splash />;

  // Esperamos la respuesta de la licencia antes de decidir qué mostrar. Si no,
  // un equipo nuevo alcanza a ver el onboarding antes de que llegue el gate
  // (chequearLicencia siempre resuelve: con timeout y catch propios).
  if (licencia === null) return <Splash />;

  // Gate de membresía: solo si la nube está activa y este equipo no tiene licencia válida.
  const bloqueado = !!licencia.cloud && !licencia.activada && !desbloqueada;
  if (bloqueado || pidiendoCodigo)
    return (
      <Membresia
        estado={licencia}
        onActiva={() => {
          setDesbloqueada(true);
          setPidiendoCodigo(false);
        }}
      />
    );

  // Teléfono con código activo que todavía no bajó los datos: se está sumando
  // a la barbería. Mientras tanto NO le ofrecemos "crear barbería".
  // Si el sync termina y sigue sin datos, la nube estaba vacía → es el primer
  // equipo de la barbería y ahí sí corresponde el onboarding.
  const uniendose = licencia.activada && !config.onboardingCompletado && !syncTermino;
  if (sincronizando || uniendose) return <Splash texto="Sincronizando tu barbería…" />;

  // Todavía no sabemos si hay equipo cargado: esperamos, así no se ve un
  // "¿Quién sos?" vacío mientras terminan de bajar los datos.
  if (cuantosBarberos === undefined) return <Splash />;

  // Si no hay barbería armada —o quedó sin barberos— corresponde el
  // onboarding. Nunca mostramos "¿Quién sos?" con la lista vacía.
  if (!config.onboardingCompletado || sinBarberos)
    return <Onboarding onTengoCodigo={() => setPidiendoCodigo(true)} />;

  // Teléfono sin barbero identificado (recién sumado a la barbería o después
  // de "cambiar de barbero"): que entre con su PIN.
  if (!config.barberoActivoUuid) return <Acceso />;

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
        {tab === 'stock' && <Stock config={config} />}
        {tab === 'stats' && <Stats config={config} />}
        {tab === 'barberia' && config.esDuenio && <Barberia config={config} />}

        <AsistenteBurbuja config={config} />
        <BottomNav activa={tab} onCambiar={setTab} esDuenio={config.esDuenio} />
      </div>
    </AbrirAjustesContext.Provider>
  );
}

function Splash({ texto }: { texto?: string }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-carbon-50">
      <div className="animate-pop">
        <Logo />
      </div>
      {texto && <p className="animate-fade text-sm font-semibold text-carbon-900/50">{texto}</p>}
    </div>
  );
}
