-- MEDLUXBD v1.0.0 production hardening
-- Integrity protections without breaking existing features.

-- Prevent duplicate active vinculos for same equipamento
create unique index if not exists ux_vinculos_equipamento_ativo
  on public.vinculos(equipamento_id)
  where upper(coalesce(status, '')) = 'ATIVO';

-- Safe delete guards for equipamentos/obras/profiles (if hard delete attempted)
create or replace function public.prevent_delete_with_vinculos()
returns trigger
language plpgsql
as $$
begin
  if TG_TABLE_NAME = 'equipamentos' then
    if exists (select 1 from public.vinculos v where v.equipamento_id = old.id and upper(coalesce(v.status, '')) = 'ATIVO') then
      raise exception 'Não é permitido excluir equipamento com vínculo ativo.' using errcode = '23503';
    end if;
  elsif TG_TABLE_NAME = 'obras' then
    if exists (select 1 from public.vinculos v where v.obra_id = old.id) then
      raise exception 'Não é permitido excluir obra com vínculos.' using errcode = '23503';
    end if;
  elsif TG_TABLE_NAME = 'profiles' then
    if exists (select 1 from public.vinculos v where v.user_id = old.id) then
      raise exception 'Não é permitido excluir usuário com vínculos.' using errcode = '23503';
    end if;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_equipamentos_no_delete_with_vinculos on public.equipamentos;
create trigger trg_equipamentos_no_delete_with_vinculos
before delete on public.equipamentos
for each row execute function public.prevent_delete_with_vinculos();

drop trigger if exists trg_obras_no_delete_with_vinculos on public.obras;
create trigger trg_obras_no_delete_with_vinculos
before delete on public.obras
for each row execute function public.prevent_delete_with_vinculos();

drop trigger if exists trg_profiles_no_delete_with_vinculos on public.profiles;
create trigger trg_profiles_no_delete_with_vinculos
before delete on public.profiles
for each row execute function public.prevent_delete_with_vinculos();
