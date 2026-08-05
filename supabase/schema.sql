-- Esquema de Corte en Supabase (Modelo B: multi-dispositivo en vivo).
-- Correr una vez en el SQL Editor del proyecto Supabase.
--
-- Idea:
--  * Cada barbería = un CÓDIGO de licencia + una "cuenta" de Supabase Auth
--    (todos sus barberos comparten esa cuenta → ven lo mismo en vivo).
--  * `datos` guarda cada registro sincronizable (cortes, turnos, etc.) scopeado
--    por `owner` (= auth.uid() de la barbería). RLS: cada uno solo ve lo suyo.
--  * Las funciones serverless usan la service key (licencias, alta de cuentas,
--    reservas del link público). El navegador del barbero usa la anon key +
--    su sesión (RLS lo aísla). El service key nunca toca el navegador.

-- ── Licencias / membresías ──────────────────────────────────────────────
create table if not exists licencias (
  codigo        text primary key,
  barberia      text,
  plan          text        not null default 'trial',   -- trial | pro | full
  estado        text        not null default 'activa',  -- activa | suspendida
  creada_en     timestamptz not null default now(),
  vence_en      timestamptz,
  ultimo_uso    timestamptz,
  stats         jsonb       not null default '{}'::jsonb,
  nota          text,
  -- Cuenta de Supabase Auth de esta barbería (la crea api/activar).
  auth_uid      uuid,
  auth_email    text,
  auth_pass     text
);
create index if not exists licencias_ultimo_uso_idx on licencias (ultimo_uso desc);

-- ── Respaldo simple (snapshot) — se mantiene como red de seguridad ──────
create table if not exists respaldos (
  codigo         text primary key references licencias(codigo) on delete cascade,
  data           jsonb       not null,
  stats          jsonb       not null default '{}'::jsonb,
  actualizado_en timestamptz not null default now()
);

-- ── Datos sincronizables (el corazón del Modelo B) ──────────────────────
-- Una fila por registro. `tabla` = 'cortes'|'turnos'|'barberos'|... ; `id` =
-- uuid del registro; `data` = el registro completo; `deleted` = tombstone.
create table if not exists datos (
  owner       uuid        not null default auth.uid(),
  tabla       text        not null,
  id          text        not null,
  data        jsonb       not null,
  updated_at  timestamptz not null default now(),
  deleted     boolean     not null default false,
  primary key (owner, tabla, id)
);
create index if not exists datos_owner_updated_idx on datos (owner, updated_at desc);

-- ── RLS: cada barbería solo ve/edita sus propios datos ──────────────────
alter table licencias enable row level security;   -- sin políticas: solo service role
alter table respaldos  enable row level security;   -- sin políticas: solo service role
alter table datos      enable row level security;

drop policy if exists datos_select on datos;
drop policy if exists datos_insert on datos;
drop policy if exists datos_update on datos;
create policy datos_select on datos for select using (owner = auth.uid());
create policy datos_insert on datos for insert with check (owner = auth.uid());
create policy datos_update on datos for update using (owner = auth.uid()) with check (owner = auth.uid());

-- ── Realtime: avisar a los otros dispositivos al instante ───────────────
alter publication supabase_realtime add table datos;
