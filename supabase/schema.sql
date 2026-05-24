-- MetricRun — Esquema de base de datos

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  distance_km numeric(5,2) not null,
  duration_seconds integer not null,
  date date not null,
  notes text,
  cadence integer,
  stride_length_cm numeric(5,1),
  created_at timestamptz not null default now()
);

-- Índice para ordenar por fecha rápidamente
create index if not exists idx_runs_date on runs (date desc);

