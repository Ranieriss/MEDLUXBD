-- MEDLUXBD enterprise SaaS foundation (LGPD + multi-tenant base)
-- Keeps app version stable while adding non-breaking schema capabilities.

create extension if not exists pgcrypto;

-- 1) Organizations (tenant root)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'ATIVA',
  retention_days integer not null default 365,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ensure at least one default organization for backward-compatible backfill
insert into public.organizations (name)
select 'Organização padrão MEDLUXBD'
where not exists (select 1 from public.organizations);

-- 2) Phase 1: LGPD tables/fields
create table if not exists public.consent_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  legal_basis text not null,
  consent_version text not null,
  granted boolean not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  source text,
  ip_hash text,
  user_agent text,
  retention_until timestamptz,
  created_at timestamptz not null default now()
);

alter table if exists public.audit_log
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict,
  add column if not exists user_ref text,
  add column if not exists retention_until timestamptz,
  add column if not exists legal_hold boolean not null default false;

alter table if exists public.profiles
  add column if not exists retention_until timestamptz,
  add column if not exists anonymized_at timestamptz;

alter table if exists public.medicoes
  add column if not exists retention_until timestamptz;

alter table if exists public.equipamentos
  add column if not exists retention_until timestamptz;

alter table if exists public.obras
  add column if not exists retention_until timestamptz;

alter table if exists public.vinculos
  add column if not exists retention_until timestamptz;

-- 3) Phase 2: organization_id in core entities
alter table if exists public.profiles add column if not exists organization_id uuid references public.organizations(id) on delete restrict;
alter table if exists public.equipamentos add column if not exists organization_id uuid references public.organizations(id) on delete restrict;
alter table if exists public.obras add column if not exists organization_id uuid references public.organizations(id) on delete restrict;
alter table if exists public.vinculos add column if not exists organization_id uuid references public.organizations(id) on delete restrict;
alter table if exists public.medicoes add column if not exists organization_id uuid references public.organizations(id) on delete restrict;

-- Backfill organization_id for old data
with default_org as (
  select id from public.organizations order by created_at asc limit 1
)
update public.profiles p
set organization_id = d.id
from default_org d
where p.organization_id is null;

with default_org as (
  select id from public.organizations order by created_at asc limit 1
)
update public.equipamentos e
set organization_id = d.id
from default_org d
where e.organization_id is null;

with default_org as (
  select id from public.organizations order by created_at asc limit 1
)
update public.obras o
set organization_id = d.id
from default_org d
where o.organization_id is null;

with default_org as (
  select id from public.organizations order by created_at asc limit 1
)
update public.vinculos v
set organization_id = d.id
from default_org d
where v.organization_id is null;

with default_org as (
  select id from public.organizations order by created_at asc limit 1
)
update public.medicoes m
set organization_id = d.id
from default_org d
where m.organization_id is null;

with default_org as (
  select id from public.organizations order by created_at asc limit 1
)
update public.audit_log a
set organization_id = d.id,
    user_ref = coalesce(a.user_ref, a.user_id::text)
from default_org d
where a.organization_id is null or a.user_ref is null;

-- Set not null after backfill (core entities)
alter table if exists public.profiles alter column organization_id set not null;
alter table if exists public.equipamentos alter column organization_id set not null;
alter table if exists public.obras alter column organization_id set not null;
alter table if exists public.vinculos alter column organization_id set not null;
alter table if exists public.medicoes alter column organization_id set not null;
alter table if exists public.audit_log alter column organization_id set not null;

-- 4) Indexes
create index if not exists idx_profiles_organization_id on public.profiles(organization_id);
create index if not exists idx_equipamentos_organization_id on public.equipamentos(organization_id);
create index if not exists idx_obras_organization_id on public.obras(organization_id);
create index if not exists idx_vinculos_organization_id on public.vinculos(organization_id);
create index if not exists idx_medicoes_organization_id on public.medicoes(organization_id);
create index if not exists idx_audit_log_organization_id_created_at on public.audit_log(organization_id, created_at desc);
create index if not exists idx_consent_logs_organization_id_created_at on public.consent_logs(organization_id, created_at desc);

-- 5) Traceability hardening for audit logs
create or replace function public.audit_log_immutability_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if old.user_ref is distinct from new.user_ref then
      raise exception 'audit_log.user_ref is immutable';
    end if;
    if old.created_at is distinct from new.created_at then
      raise exception 'audit_log.created_at is immutable';
    end if;
  elsif tg_op = 'DELETE' then
    raise exception 'audit_log rows cannot be deleted';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_log_immutability_guard on public.audit_log;
create trigger trg_audit_log_immutability_guard
before update or delete on public.audit_log
for each row execute function public.audit_log_immutability_guard();

create or replace function public.audit_log_set_user_ref()
returns trigger
language plpgsql
as $$
begin
  new.user_ref := coalesce(new.user_ref, new.user_id::text, new.payload->>'user_id', 'anonymous');
  return new;
end;
$$;

drop trigger if exists trg_audit_log_set_user_ref on public.audit_log;
create trigger trg_audit_log_set_user_ref
before insert on public.audit_log
for each row execute function public.audit_log_set_user_ref();

-- 6) LGPD anonymization function for user deletion requests
create or replace function public.anonymize_user_data(target_user_id uuid, actor_user_id uuid default auth.uid())
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  anon_email text;
  org_id uuid;
begin
  select organization_id into org_id from public.profiles where id = target_user_id;

  anon_email := 'anon+' || encode(digest(target_user_id::text || clock_timestamp()::text, 'sha256'), 'hex') || '@anon.medluxbd';

  update public.profiles
  set
    email = anon_email,
    nome = 'Usuário anonimizado',
    anonymized_at = now(),
    updated_at = now()
  where id = target_user_id;

  update public.medicoes
  set
    observacoes = null,
    updated_at = now()
  where user_id = target_user_id;

  insert into public.audit_log (organization_id, user_id, user_ref, action, payload, created_at)
  values (
    coalesce(org_id, (select id from public.organizations order by created_at asc limit 1)),
    actor_user_id,
    coalesce(actor_user_id::text, 'system'),
    'LGPD:USER_ANONYMIZED',
    jsonb_build_object('target_user_id', target_user_id::text, 'actor_user_id', coalesce(actor_user_id::text, 'system')),
    now()
  );
end;
$$;

revoke all on function public.anonymize_user_data(uuid, uuid) from public;
grant execute on function public.anonymize_user_data(uuid, uuid) to authenticated;

-- 7) RLS updates preserving prior behavior + tenant isolation
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = (
        select p2.organization_id from public.profiles p2 where p2.id = auth.uid() limit 1
      )
      and upper(coalesce(p.role, 'USER')) = 'ADMIN'
  );
$$;

-- profiles
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using (id = auth.uid() and organization_id = (select organization_id from public.profiles where id = auth.uid()));

DROP POLICY IF EXISTS profiles_upsert_own ON public.profiles;
create policy profiles_upsert_own on public.profiles
for all to authenticated
using (id = auth.uid() and organization_id = (select organization_id from public.profiles where id = auth.uid()))
with check (id = auth.uid() and organization_id = (select organization_id from public.profiles where id = auth.uid()));

-- equipamentos
DROP POLICY IF EXISTS equipamentos_select_authenticated ON public.equipamentos;
create policy equipamentos_select_authenticated on public.equipamentos
for select to authenticated
using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

DROP POLICY IF EXISTS equipamentos_write_authenticated ON public.equipamentos;
create policy equipamentos_write_authenticated on public.equipamentos
for all to authenticated
using (organization_id = (select organization_id from public.profiles where id = auth.uid()) and public.is_admin())
with check (organization_id = (select organization_id from public.profiles where id = auth.uid()) and public.is_admin());

-- obras
DROP POLICY IF EXISTS obras_select_authenticated ON public.obras;
create policy obras_select_authenticated on public.obras
for select to authenticated
using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

DROP POLICY IF EXISTS obras_write_authenticated ON public.obras;
create policy obras_write_authenticated on public.obras
for all to authenticated
using (organization_id = (select organization_id from public.profiles where id = auth.uid()) and public.is_admin())
with check (organization_id = (select organization_id from public.profiles where id = auth.uid()) and public.is_admin());

-- vinculos
DROP POLICY IF EXISTS vinculos_select_own_or_all ON public.vinculos;
create policy vinculos_select_own_or_all on public.vinculos
for select to authenticated
using (
  organization_id = (select organization_id from public.profiles where id = auth.uid())
  and (user_id = auth.uid() or public.is_admin())
);

DROP POLICY IF EXISTS vinculos_write_own ON public.vinculos;
create policy vinculos_write_own on public.vinculos
for all to authenticated
using (
  organization_id = (select organization_id from public.profiles where id = auth.uid())
  and (user_id = auth.uid() or public.is_admin())
)
with check (
  organization_id = (select organization_id from public.profiles where id = auth.uid())
  and (user_id = auth.uid() or public.is_admin())
);

-- medicoes
DROP POLICY IF EXISTS medicoes_select_own ON public.medicoes;
create policy medicoes_select_own on public.medicoes
for select to authenticated
using (
  organization_id = (select organization_id from public.profiles where id = auth.uid())
  and (user_id = auth.uid() or public.is_admin())
);

DROP POLICY IF EXISTS medicoes_write_own ON public.medicoes;
create policy medicoes_write_own on public.medicoes
for all to authenticated
using (
  organization_id = (select organization_id from public.profiles where id = auth.uid())
  and (user_id = auth.uid() or public.is_admin())
)
with check (
  organization_id = (select organization_id from public.profiles where id = auth.uid())
  and (user_id = auth.uid() or public.is_admin())
);

-- audit
DROP POLICY IF EXISTS audit_select_own ON public.audit_log;
create policy audit_select_own on public.audit_log
for select to authenticated
using (
  organization_id = (select organization_id from public.profiles where id = auth.uid())
  and (user_id = auth.uid() or public.is_admin() or user_id is null)
);

DROP POLICY IF EXISTS audit_insert_own ON public.audit_log;
create policy audit_insert_own on public.audit_log
for insert to authenticated
with check (
  organization_id = (select organization_id from public.profiles where id = auth.uid())
  and (user_id = auth.uid() or public.is_admin() or user_id is null)
);

-- consent logs
alter table public.consent_logs enable row level security;
DROP POLICY IF EXISTS consent_select_same_org ON public.consent_logs;
create policy consent_select_same_org on public.consent_logs
for select to authenticated
using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

DROP POLICY IF EXISTS consent_insert_same_org ON public.consent_logs;
create policy consent_insert_same_org on public.consent_logs
for insert to authenticated
with check (organization_id = (select organization_id from public.profiles where id = auth.uid()));
