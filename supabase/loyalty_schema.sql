-- ============================================================
-- EatUp — Programme de fidélité (carte tampon + points)
-- ============================================================
-- À exécuter une seule fois dans l'éditeur SQL de Supabase
-- (Dashboard Supabase → SQL Editor → New query → coller → Run).
-- Le schéma est idempotent : il peut être relancé sans erreur.
-- ============================================================

-- Identité client, partagée entre tous les restaurants EatUp.
-- Compte "léger" : pas de mot de passe, connexion par lien magique (email).
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  phone text,
  first_name text,
  last_name text,
  created_at timestamptz not null default now()
);

create index if not exists customers_email_idx on customers (lower(email));

-- Correctif pour un projet où une ancienne table `customers` existait déjà
-- (version antérieure, un client par restaurant, sans email obligatoire/unique).
-- Sans effet si la table vient d'être créée ci-dessus.
drop policy if exists "Restaurant owners can manage their customers" on customers;

alter table customers alter column first_name drop not null;
alter table customers alter column email set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'customers_email_key') then
    alter table customers add constraint customers_email_key unique (email);
  end if;
end $$;

alter table customers drop constraint if exists customers_restaurant_id_fkey;
alter table customers drop column if exists restaurant_id;
alter table customers drop column if exists total_orders;
alter table customers drop column if exists last_order_date;

-- Configuration du programme de fidélité — un par restaurant.
-- Les deux mécaniques (tampons ET points) peuvent être activées en même temps.
create table if not exists loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null unique references restaurants(id) on delete cascade,

  stamps_enabled boolean not null default true,
  stamps_threshold int not null default 10 check (stamps_threshold > 0),
  stamps_reward_label text not null default 'Un article offert',
  min_order_for_stamp numeric not null default 0,

  points_enabled boolean not null default false,
  points_per_euro numeric not null default 1 check (points_per_euro >= 0),
  points_per_reward numeric not null default 100 check (points_per_reward > 0),
  points_reward_label text not null default '5€ de réduction',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Solde de fidélité d'un client dans un restaurant donné.
create table if not exists loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,

  stamps_count int not null default 0,
  points_balance numeric not null default 0,

  lifetime_stamps int not null default 0,
  lifetime_points numeric not null default 0,
  lifetime_spent numeric not null default 0,
  lifetime_orders int not null default 0,

  updated_at timestamptz not null default now(),
  unique (customer_id, restaurant_id)
);

create index if not exists loyalty_accounts_restaurant_idx on loyalty_accounts (restaurant_id);
create index if not exists loyalty_accounts_customer_idx on loyalty_accounts (customer_id);

-- Journal de tous les mouvements (audit + historique visible côté client/commerçant).
create table if not exists loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,

  type text not null check (type in ('stamp_earned', 'stamp_redeemed', 'points_earned', 'points_redeemed', 'manual_credit')),
  stamps_delta int not null default 0,
  points_delta numeric not null default 0,
  note text,
  created_by text,

  created_at timestamptz not null default now()
);

create index if not exists loyalty_transactions_lookup_idx on loyalty_transactions (restaurant_id, customer_id, created_at desc);

-- Rattache une commande au client fidélité correspondant (nullable : n'existait pas avant).
alter table orders add column if not exists customer_id uuid references customers(id) on delete set null;
create index if not exists orders_customer_idx on orders (customer_id);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
-- Toutes les écritures (crédit de points, tampons, création client)
-- passent par le serveur (clé service_role), qui contourne la RLS.
-- Les policies ci-dessous ne gouvernent que les LECTURES faites
-- directement depuis le navigateur (dashboard commerçant, carte client).

alter table customers enable row level security;
alter table loyalty_programs enable row level security;
alter table loyalty_accounts enable row level security;
alter table loyalty_transactions enable row level security;

drop policy if exists "customer reads own profile" on customers;
create policy "customer reads own profile" on customers
  for select using (lower(email) = lower(auth.jwt() ->> 'email'));

-- Le commerçant peut lire la fiche des clients qui ont un compte fidélité chez lui
-- (jamais l'ensemble de la base clients EatUp, seulement les siens).
drop policy if exists "owner reads customers with account at their restaurant" on customers;
create policy "owner reads customers with account at their restaurant" on customers
  for select using (
    exists (
      select 1 from loyalty_accounts la
      join restaurants r on r.id = la.restaurant_id
      where la.customer_id = customers.id and r.owner_id = auth.uid()
    )
  );

drop policy if exists "owner manages own loyalty program" on loyalty_programs;
create policy "owner manages own loyalty program" on loyalty_programs
  for all using (
    exists (select 1 from restaurants r where r.id = loyalty_programs.restaurant_id and r.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from restaurants r where r.id = loyalty_programs.restaurant_id and r.owner_id = auth.uid())
  );

-- Lecture publique nécessaire pour afficher la carte fidélité sur la page
-- du restaurant avant même que le client ne soit connecté (règles du programme).
drop policy if exists "public can read loyalty programs" on loyalty_programs;
create policy "public can read loyalty programs" on loyalty_programs
  for select using (true);

drop policy if exists "owner reads own restaurant loyalty accounts" on loyalty_accounts;
create policy "owner reads own restaurant loyalty accounts" on loyalty_accounts
  for select using (
    exists (select 1 from restaurants r where r.id = loyalty_accounts.restaurant_id and r.owner_id = auth.uid())
  );

drop policy if exists "customer reads own loyalty account" on loyalty_accounts;
create policy "customer reads own loyalty account" on loyalty_accounts
  for select using (
    exists (select 1 from customers c where c.id = loyalty_accounts.customer_id and lower(c.email) = lower(auth.jwt() ->> 'email'))
  );

drop policy if exists "owner reads own restaurant loyalty transactions" on loyalty_transactions;
create policy "owner reads own restaurant loyalty transactions" on loyalty_transactions
  for select using (
    exists (select 1 from restaurants r where r.id = loyalty_transactions.restaurant_id and r.owner_id = auth.uid())
  );

drop policy if exists "customer reads own loyalty transactions" on loyalty_transactions;
create policy "customer reads own loyalty transactions" on loyalty_transactions
  for select using (
    exists (select 1 from customers c where c.id = loyalty_transactions.customer_id and lower(c.email) = lower(auth.jwt() ->> 'email'))
  );
