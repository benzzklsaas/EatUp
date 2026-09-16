-- BK Labs — Client OS · Schéma de référence (Postgres / Supabase)
-- ---------------------------------------------------------------
-- Non appliqué en V1 : l'application stocke l'espace de travail dans le
-- navigateur. Ce fichier décrit la cible pour le jour où l'on branche une base.
--
-- Le modèle TypeScript de `lib/client-os/types.ts` correspond ligne à ligne à
-- ces tables. Le passage à la base consiste à écrire un adaptateur
-- `WorkspaceRepository` (voir `lib/client-os/store.tsx`) — pas à réécrire l'UI.

create extension if not exists "pgcrypto";

-- Équipe BK Labs ------------------------------------------------------------

create type cos_user_role as enum ('owner', 'admin', 'member', 'viewer');

create table cos_users (
  id          uuid primary key default gen_random_uuid(),
  auth_id     uuid unique,                 -- référence auth.users côté Supabase
  name        text not null,
  email       text not null unique,
  role        cos_user_role not null default 'member',
  created_at  timestamptz not null default now()
);

-- Dossiers clients ----------------------------------------------------------

create type cos_dossier_status as enum
  ('prospect', 'actif', 'attente_client', 'production', 'livre', 'maintenance');

create table cos_clients (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid references cos_users (id) on delete set null,

  company_name    text not null,
  sector          text default '',
  employees       text default '',
  area            text default '',
  website         text default '',
  socials         text default '',
  address         text default '',

  contact_first_name text default '',
  contact_last_name  text default '',
  contact_role       text default '',
  contact_phone      text default '',
  contact_email      text default '',

  project_name    text default '',
  status          cos_dossier_status not null default 'prospect',
  deadline        date,

  -- Blocs de texte long : un jsonb par section garde le schéma lisible et
  -- évite 40 colonnes texte. Les champs sont typés côté application.
  discovery       jsonb not null default '{}'::jsonb,
  analysis        jsonb not null default '{}'::jsonb,
  creative        jsonb not null default '{}'::jsonb,
  validation      jsonb not null default '{}'::jsonb,
  admin           jsonb not null default '{}'::jsonb,
  follow_up       jsonb not null default '{}'::jsonb,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create index on cos_clients (status);
create index on cos_clients (deadline);
create index on cos_clients (owner_id);

-- Planning ------------------------------------------------------------------

create table cos_timeline_steps (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references cos_clients (id) on delete cascade,
  step_key   text not null,
  done       boolean not null default false,
  done_at    date,
  unique (client_id, step_key)
);

-- Périmètre -----------------------------------------------------------------

create type cos_scope_bucket as enum ('deliverables', 'features', 'screens', 'exclusions');

create table cos_scope_items (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references cos_clients (id) on delete cascade,
  bucket     cos_scope_bucket not null,
  label      text not null,
  position   int not null default 0
);

-- Contenus & ressources -----------------------------------------------------

create type cos_resource_status as enum ('recu', 'attente', 'manquant');

create table cos_resources (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references cos_clients (id) on delete cascade,
  label      text not null,
  status     cos_resource_status not null default 'attente',
  note       text default ''
);

-- Corrections ---------------------------------------------------------------

create type cos_correction_status as enum ('a_faire', 'en_cours', 'termine');
create type cos_priority as enum ('basse', 'normale', 'haute');

create table cos_corrections (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references cos_clients (id) on delete cascade,
  area        text default '',
  description text not null,
  status      cos_correction_status not null default 'a_faire',
  priority    cos_priority not null default 'normale',
  created_at  date not null default current_date
);

-- Livraison & opportunités --------------------------------------------------

create table cos_delivery_items (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references cos_clients (id) on delete cascade,
  label      text not null,
  done       boolean not null default false,
  position   int not null default 0
);

create type cos_opportunity_status as enum ('identifiee', 'proposee', 'signee', 'refusee');

create table cos_opportunities (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references cos_clients (id) on delete cascade,
  label      text not null,
  status     cos_opportunity_status not null default 'identifiee'
);

-- Notes & historique --------------------------------------------------------

create table cos_notes (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references cos_clients (id) on delete cascade,
  body       text not null,
  author_id  uuid references cos_users (id) on delete set null,
  created_at timestamptz not null default now()
);

create type cos_history_status as enum ('fait', 'en_cours', 'prevu');

create table cos_history_events (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references cos_clients (id) on delete cascade,
  date       date not null default current_date,
  step       text not null,
  action     text not null,
  owner_id   uuid references cos_users (id) on delete set null,
  status     cos_history_status not null default 'fait',
  auto       boolean not null default false,
  ref        text
);

create index on cos_history_events (client_id, date desc);

-- Préparé pour la V2 --------------------------------------------------------

create type cos_invoice_status as enum ('brouillon', 'envoyee', 'payee', 'retard');

create table cos_invoices (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references cos_clients (id) on delete cascade,
  number     text not null,
  label      text default '',
  amount     numeric(10, 2) not null default 0,
  status     cos_invoice_status not null default 'brouillon',
  issued_at  date,
  due_at     date,
  paid_at    date
);

create table cos_documents (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references cos_clients (id) on delete cascade,
  name        text not null,
  kind        text not null default 'autre',
  url         text not null,
  uploaded_by uuid references cos_users (id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create table cos_tasks (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references cos_clients (id) on delete cascade,
  title       text not null,
  done        boolean not null default false,
  due_at      date,
  assignee_id uuid references cos_users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table cos_comments (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id   uuid not null,
  body        text not null,
  author_id   uuid references cos_users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table cos_notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references cos_users (id) on delete cascade,
  client_id  uuid references cos_clients (id) on delete cascade,
  kind       text not null,
  body       text not null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- Sécurité ------------------------------------------------------------------
-- Outil interne : tout membre authentifié de l'espace BK Labs accède aux
-- dossiers. Les permissions fines (par rôle) arriveront avec le module
-- multi-utilisateurs.

alter table cos_clients        enable row level security;
alter table cos_timeline_steps enable row level security;
alter table cos_scope_items    enable row level security;
alter table cos_resources      enable row level security;
alter table cos_corrections    enable row level security;
alter table cos_delivery_items enable row level security;
alter table cos_opportunities  enable row level security;
alter table cos_notes          enable row level security;
alter table cos_history_events enable row level security;
