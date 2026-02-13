-- MEDLUXBD v1.0.0 optional foundation for org-RLS + soft delete.

alter table if exists public.profiles
  add column if not exists organization_id uuid;

alter table if exists public.equipamentos
  add column if not exists organization_id uuid,
  add column if not exists deleted_at timestamptz;

alter table if exists public.obras
  add column if not exists organization_id uuid,
  add column if not exists deleted_at timestamptz;

alter table if exists public.vinculos
  add column if not exists organization_id uuid,
  add column if not exists deleted_at timestamptz;

alter table if exists public.medicoes
  add column if not exists organization_id uuid,
  add column if not exists deleted_at timestamptz;

alter table if exists public.audit_log
  add column if not exists organization_id uuid;

create or replace function public.current_org_id()
returns uuid
language sql
stable
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create index if not exists idx_profiles_organization_id on public.profiles(organization_id);
create index if not exists idx_equipamentos_org_deleted on public.equipamentos(organization_id, deleted_at);
create index if not exists idx_obras_org_deleted on public.obras(organization_id, deleted_at);
create index if not exists idx_vinculos_org_deleted on public.vinculos(organization_id, deleted_at);
create index if not exists idx_medicoes_org_deleted on public.medicoes(organization_id, deleted_at);
create index if not exists idx_audit_org on public.audit_log(organization_id);
