-- MEDLUXBD - schema alignment for frontend expectations
-- Safe/idempotent migration for existing projects with partial schema.

create extension if not exists pgcrypto;

-- 1) Base tables -------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'USER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nome text not null,
  modelo text,
  status text default 'ATIVO',
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.obras (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nome text not null,
  local text,
  status text default 'ATIVA',
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vinculos (
  id uuid primary key default gen_random_uuid(),
  equipamento_id uuid not null references public.equipamentos(id) on delete cascade,
  obra_id uuid not null references public.obras(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  data_entrega date not null,
  status text default 'ATIVO',
  termo_path text,
  encerrou_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medicoes (
  id uuid primary key default gen_random_uuid(),
  equipamento_id uuid not null references public.equipamentos(id) on delete cascade,
  obra_id uuid not null references public.obras(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null,
  valor numeric(14,2) not null,
  unidade text not null,
  conforme boolean not null default true,
  medido_em timestamptz not null,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 2) Backfill/compatibility columns -----------------------------------------
alter table if exists public.profiles add column if not exists id uuid;
alter table if exists public.profiles add column if not exists user_id uuid;
alter table if exists public.profiles add column if not exists email text;
alter table if exists public.profiles add column if not exists role text default 'USER';
alter table if exists public.profiles add column if not exists created_at timestamptz not null default now();
alter table if exists public.profiles add column if not exists updated_at timestamptz not null default now();

alter table if exists public.vinculos add column if not exists encerrou_em timestamptz;
alter table if exists public.vinculos add column if not exists created_at timestamptz not null default now();
alter table if exists public.vinculos add column if not exists updated_at timestamptz not null default now();

alter table if exists public.audit_log add column if not exists created_at timestamptz not null default now();

-- If profiles existed with user_id but without id, copy values.
update public.profiles
set id = user_id
where id is null and user_id is not null;

-- Ensure id is filled where possible using auth.users by email.
update public.profiles p
set id = u.id
from auth.users u
where p.id is null and p.email is not null and u.email = p.email;

-- Attach FK + PK only when possible.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'id'
  ) then
    begin
      alter table public.profiles
        add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade;
    exception when duplicate_object then null;
    end;

    begin
      alter table public.profiles add constraint profiles_pkey primary key (id);
    exception when duplicate_table then null;
    when duplicate_object then null;
    end;
  end if;
end $$;

-- 3) Useful indexes ----------------------------------------------------------
create index if not exists idx_vinculos_user_id on public.vinculos(user_id);
create index if not exists idx_vinculos_encerrou_em on public.vinculos(encerrou_em);
create index if not exists idx_medicoes_user_id on public.medicoes(user_id);
create index if not exists idx_audit_log_created_at on public.audit_log(created_at desc);

-- 4) Updated_at trigger ------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_equipamentos_updated_at on public.equipamentos;
create trigger trg_equipamentos_updated_at before update on public.equipamentos
for each row execute function public.set_updated_at();

drop trigger if exists trg_obras_updated_at on public.obras;
create trigger trg_obras_updated_at before update on public.obras
for each row execute function public.set_updated_at();

drop trigger if exists trg_vinculos_updated_at on public.vinculos;
create trigger trg_vinculos_updated_at before update on public.vinculos
for each row execute function public.set_updated_at();

drop trigger if exists trg_medicoes_updated_at on public.medicoes;
create trigger trg_medicoes_updated_at before update on public.medicoes
for each row execute function public.set_updated_at();

-- 5) Basic RLS policies ------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and upper(coalesce(p.role, 'USER')) = 'ADMIN'
  );
$$;

alter table public.profiles enable row level security;
alter table public.equipamentos enable row level security;
alter table public.obras enable row level security;
alter table public.vinculos enable row level security;
alter table public.medicoes enable row level security;
alter table public.audit_log enable row level security;

-- profiles
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using (id = auth.uid());

DROP POLICY IF EXISTS profiles_upsert_own ON public.profiles;
create policy profiles_upsert_own on public.profiles
for all to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- equipamentos
DROP POLICY IF EXISTS equipamentos_select_authenticated ON public.equipamentos;
create policy equipamentos_select_authenticated on public.equipamentos
for select to authenticated
using (true or public.is_admin());

DROP POLICY IF EXISTS equipamentos_write_authenticated ON public.equipamentos;
create policy equipamentos_write_authenticated on public.equipamentos
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- obras
DROP POLICY IF EXISTS obras_select_authenticated ON public.obras;
create policy obras_select_authenticated on public.obras
for select to authenticated
using (true or public.is_admin());

DROP POLICY IF EXISTS obras_write_authenticated ON public.obras;
create policy obras_write_authenticated on public.obras
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- vinculos
DROP POLICY IF EXISTS vinculos_select_own_or_all ON public.vinculos;
create policy vinculos_select_own_or_all on public.vinculos
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

DROP POLICY IF EXISTS vinculos_write_own ON public.vinculos;
create policy vinculos_write_own on public.vinculos
for all to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- medicoes
DROP POLICY IF EXISTS medicoes_select_own ON public.medicoes;
create policy medicoes_select_own on public.medicoes
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

DROP POLICY IF EXISTS medicoes_write_own ON public.medicoes;
create policy medicoes_write_own on public.medicoes
for all to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- audit
DROP POLICY IF EXISTS audit_select_own ON public.audit_log;
create policy audit_select_own on public.audit_log
for select to authenticated
using (user_id = auth.uid() or public.is_admin() or user_id is null);

DROP POLICY IF EXISTS audit_insert_own ON public.audit_log;
create policy audit_insert_own on public.audit_log
for insert to authenticated
with check (user_id = auth.uid() or public.is_admin() or user_id is null);
