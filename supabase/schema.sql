-- Esquema de Corte en Supabase.
-- Correr una vez en el SQL Editor del proyecto Supabase.
--
-- Modelo: cada barbería usa un CÓDIGO de licencia. Toda la app pega contra
-- funciones serverless (Vercel) que usan la service key; el navegador nunca
-- toca Supabase directo. Por eso RLS queda cerrado (solo el service role entra).

create table if not exists licencias (
  codigo        text primary key,
  barberia      text,
  plan          text        not null default 'trial',   -- trial | pro | full
  estado        text        not null default 'activa',  -- activa | suspendida
  creada_en     timestamptz not null default now(),
  vence_en      timestamptz,
  ultimo_uso    timestamptz,
  stats         jsonb       not null default '{}'::jsonb,
  nota          text
);

create table if not exists respaldos (
  codigo         text primary key references licencias(codigo) on delete cascade,
  data           jsonb       not null,
  stats          jsonb       not null default '{}'::jsonb,
  actualizado_en timestamptz not null default now()
);

create index if not exists licencias_ultimo_uso_idx on licencias (ultimo_uso desc);

-- RLS cerrado: sin políticas públicas, solo el service role (backend) accede.
alter table licencias enable row level security;
alter table respaldos enable row level security;
