import { useEffect, useState } from 'react';
import {
  adminListar,
  adminCrear,
  adminRevocar,
  adminActivar,
  adminBorrar,
  adminCambiarPlan,
  type LicenciaAdmin,
} from '../../lib/nube';
import { PLAN_ORDEN, nombrePlan } from '../../lib/planes';
import { Logo } from '../../components/Logo';
import { IconoCopiar, IconoTacho, IconoCheck, IconoCandado } from '../../components/Iconos';

const LS_TOKEN = 'corte.admin.token';

function haceCuanto(iso?: string): string {
  if (!iso) return 'nunca';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 30) return `hace ${d} d`;
  return `hace ${Math.floor(d / 30)} m`;
}

const usada = (l: LicenciaAdmin) =>
  l.ultimo_uso && Date.now() - new Date(l.ultimo_uso).getTime() < 7 * 86400000;

/** Panel del dueño de la app (Luciano): ver y controlar todas las barberías. */
export function Admin() {
  const [token, setToken] = useState(localStorage.getItem(LS_TOKEN) ?? '');
  const [entrada, setEntrada] = useState('');
  const [licencias, setLicencias] = useState<LicenciaAdmin[] | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // Form crear
  const [nueva, setNueva] = useState({ barberia: '', plan: 'trial', dias: '' });
  const [creado, setCreado] = useState<LicenciaAdmin | null>(null);

  async function cargar(t: string) {
    setCargando(true);
    setError('');
    try {
      const l = await adminListar(t);
      setLicencias(l);
      localStorage.setItem(LS_TOKEN, t);
      setToken(t);
    } catch (e) {
      const m = String(e);
      if (m.includes('no_cloud'))
        setError('Falta Supabase: cargá SUPABASE_URL y SUPABASE_SERVICE_KEY en Vercel y redeployá.');
      else if (m.includes('no_autorizado'))
        setError(
          'No autorizado. Token incorrecto, o la variable ADMIN_TOKEN no llegó al deploy (revisá que esté en Production y hacé Redeploy).',
        );
      else setError(`Error del servidor (${m}). ¿Corriste el schema SQL en Supabase?`);
      setLicencias(null);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (token) cargar(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function crear() {
    const l = await adminCrear(token, {
      barberia: nueva.barberia.trim() || undefined,
      plan: nueva.plan,
      dias: nueva.dias ? Number(nueva.dias) : undefined,
    });
    setCreado(l);
    setNueva({ barberia: '', plan: 'trial', dias: '' });
    cargar(token);
  }

  async function toggle(l: LicenciaAdmin) {
    if (l.estado === 'activa') await adminRevocar(token, l.codigo);
    else await adminActivar(token, l.codigo);
    cargar(token);
  }

  async function borrar(l: LicenciaAdmin) {
    if (!window.confirm(`¿Borrar ${l.barberia || l.codigo}? Se pierde su respaldo.`)) return;
    await adminBorrar(token, l.codigo);
    cargar(token);
  }

  async function cambiarPlan(l: LicenciaAdmin, plan: string) {
    if (plan === l.plan) return;
    await adminCambiarPlan(token, l.codigo, plan);
    cargar(token);
  }

  // --- Login ---
  if (!licencias) {
    return (
      <div className="safe-top mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-5 px-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo chico />
          <h1 className="text-2xl font-extrabold">Panel admin</h1>
          <p className="text-sm text-carbon-900/55">Acceso solo para el administrador.</p>
        </div>
        <input
          className="input-texto"
          type="password"
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          placeholder="Token de admin"
        />
        {error && <p className="text-center text-sm font-semibold text-rojo">{error}</p>}
        <button
          type="button"
          className="btn-primario"
          disabled={!entrada.trim() || cargando}
          onClick={() => cargar(entrada.trim())}
        >
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
      </div>
    );
  }

  // --- Panel ---
  const total = licencias.length;
  const activas = licencias.filter((l) => l.estado === 'activa').length;
  const usando = licencias.filter(usada).length;

  return (
    <div className="safe-top mx-auto min-h-full w-full max-w-md px-4 pb-16">
      <header className="flex items-center justify-between py-6">
        <h1 className="text-2xl font-extrabold">Barberías</h1>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem(LS_TOKEN);
            setLicencias(null);
            setToken('');
          }}
          className="text-sm font-semibold text-carbon-900/50"
        >
          Salir
        </button>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <Metrica label="Total" valor={total} />
        <Metrica label="Activas" valor={activas} tono="text-ok" />
        <Metrica label="Usando (7d)" valor={usando} tono="text-oro-dark" />
      </div>

      {/* Crear licencia */}
      <details className="card mb-4 p-4">
        <summary className="cursor-pointer font-bold">+ Crear código</summary>
        <div className="mt-3 space-y-2">
          <input
            className="input-texto py-2.5 text-base"
            placeholder="Nombre de la barbería"
            value={nueva.barberia}
            onChange={(e) => setNueva({ ...nueva, barberia: e.target.value })}
          />
          <div className="flex gap-2">
            <select
              className="input-texto flex-1 appearance-none py-2.5 text-base"
              value={nueva.plan}
              onChange={(e) => setNueva({ ...nueva, plan: e.target.value })}
            >
              <option value="trial">Trial</option>
              <option value="pro">Pro</option>
              <option value="full">Full</option>
            </select>
            <input
              className="input-texto num w-28 py-2.5 text-base"
              inputMode="numeric"
              placeholder="días"
              value={nueva.dias}
              onChange={(e) => setNueva({ ...nueva, dias: e.target.value.replace(/\D/g, '') })}
            />
          </div>
          <button type="button" className="btn-primario py-3 text-base" onClick={crear}>
            Generar código
          </button>
          {creado && (
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(creado.codigo)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ok/10 py-3 font-bold text-ok"
            >
              <IconoCopiar width={17} height={17} /> {creado.codigo} · copiar
            </button>
          )}
        </div>
      </details>

      {/* Lista */}
      <ul className="space-y-2">
        {licencias.map((l) => (
          <li key={l.codigo} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-bold">{l.barberia || '(sin nombre)'}</p>
                <p className="num text-xs text-carbon-900/45">{l.codigo}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  l.estado === 'activa' ? 'bg-ok/15 text-ok' : 'bg-pendiente/15 text-pendiente'
                }`}
              >
                {l.estado === 'activa' ? 'activa' : 'pausada'}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-carbon-900/55">
              <span className={`font-semibold ${usada(l) ? 'text-ok' : ''}`}>● {haceCuanto(l.ultimo_uso)}</span>
              <span className="num">{l.stats?.cortes ?? 0} cortes</span>
              <select
                value={(PLAN_ORDEN as string[]).includes(l.plan) ? l.plan : 'trial'}
                onChange={(e) => cambiarPlan(l, e.target.value)}
                aria-label="Cambiar plan"
                className="cursor-pointer appearance-none rounded bg-oro/15 px-1.5 py-0.5 font-bold uppercase text-oro-dark"
              >
                {PLAN_ORDEN.map((p) => (
                  <option key={p} value={p}>
                    {nombrePlan(p)}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => toggle(l)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold ${
                  l.estado === 'activa'
                    ? 'bg-pendiente/10 text-pendiente'
                    : 'bg-ok/10 text-ok'
                }`}
              >
                {l.estado === 'activa' ? (
                  <>
                    <IconoCandado width={15} height={15} /> Pausar
                  </>
                ) : (
                  <>
                    <IconoCheck width={15} height={15} /> Activar
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(l.codigo)}
                aria-label="Copiar código"
                className="rounded-xl bg-carbon-100 px-3 text-carbon-900/60"
              >
                <IconoCopiar width={16} height={16} />
              </button>
              <button
                type="button"
                onClick={() => borrar(l)}
                aria-label="Borrar"
                className="rounded-xl bg-rojo/10 px-3 text-rojo"
              >
                <IconoTacho width={16} height={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Metrica({ label, valor, tono }: { label: string; valor: number; tono?: string }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-carbon-900/40">{label}</p>
      <p className={`num text-2xl font-extrabold ${tono ?? ''}`}>{valor}</p>
    </div>
  );
}
