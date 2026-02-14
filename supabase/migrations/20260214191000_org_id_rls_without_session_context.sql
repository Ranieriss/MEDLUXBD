-- Remove dependency on app.current_org/session variables and enforce tenant scope by profiles.org_id + auth.uid().

alter table if exists public.profiles add column if not exists org_id uuid;

-- Keep compatibility with legacy organization_id naming.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'organization_id'
  ) then
    execute 'update public.profiles set org_id = organization_id where org_id is null';
    execute 'update public.profiles set organization_id = org_id where organization_id is null and org_id is not null';
  end if;
end $$;

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.org_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  has_role_column boolean;
  role_value text;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) into has_role_column;

  if not has_role_column then
    return false;
  end if;

  select lower(coalesce(p.role, ''))
    into role_value
  from public.profiles p
  where p.id = auth.uid()
  limit 1;

  return role_value = 'admin';
end;
$$;

-- Ensure org_id exists in app tables when present.
do $$
declare
  v_table text;
  target_tables text[] := array[
    'profiles',
    'equipamentos',
    'usuarios',
    'operadores',
    'vinculos',
    'medicoes',
    'obras',
    'criterios',
    'audit_log'
  ];
begin
  foreach v_table in array target_tables loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = v_table
    ) then
      execute format('alter table public.%I add column if not exists org_id uuid', v_table);

      if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = v_table and column_name = 'organization_id'
      ) then
        execute format('update public.%I set org_id = organization_id where org_id is null', v_table);
      end if;
    end if;
  end loop;
end $$;

-- RLS based on org_id + is_admin().
do $$
declare
  v_table text;
  write_expr text := '(public.is_admin() or org_id = public.current_org_id())';
  read_expr text := '(public.is_admin() or org_id = public.current_org_id())';
  target_tables text[] := array['equipamentos', 'usuarios', 'operadores', 'vinculos', 'medicoes', 'obras', 'criterios', 'audit_log', 'profiles'];
begin
  foreach v_table in array target_tables loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = v_table
    ) and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = v_table and column_name = 'org_id'
    ) then
      execute format('alter table public.%I enable row level security', v_table);

      execute format('drop policy if exists %I on public.%I', v_table || '_select_same_org', v_table);
      execute format(
        'create policy %I on public.%I for select using (%s)',
        v_table || '_select_same_org',
        v_table,
        read_expr
      );

      execute format('drop policy if exists %I on public.%I', v_table || '_insert_same_org', v_table);
      execute format(
        'create policy %I on public.%I for insert with check (%s)',
        v_table || '_insert_same_org',
        v_table,
        write_expr
      );

      execute format('drop policy if exists %I on public.%I', v_table || '_update_same_org', v_table);
      execute format(
        'create policy %I on public.%I for update using (%s) with check (%s)',
        v_table || '_update_same_org',
        v_table,
        write_expr,
        write_expr
      );
    end if;
  end loop;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='profiles') then
    execute 'create index if not exists idx_profiles_org_id on public.profiles(org_id)';
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='equipamentos') then
    execute 'create index if not exists idx_equipamentos_org_id on public.equipamentos(org_id)';
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='obras') then
    execute 'create index if not exists idx_obras_org_id on public.obras(org_id)';
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='vinculos') then
    execute 'create index if not exists idx_vinculos_org_id on public.vinculos(org_id)';
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='medicoes') then
    execute 'create index if not exists idx_medicoes_org_id on public.medicoes(org_id)';
  end if;
end $$;
