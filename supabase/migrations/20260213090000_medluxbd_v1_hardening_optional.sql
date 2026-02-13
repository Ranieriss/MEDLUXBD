-- MEDLUXBD v1.0.0 hardening (opcional)
-- Execute no Supabase SQL Editor caso queira habilitar soft delete em medicoes.

alter table if exists public.medicoes
  add column if not exists deleted_at timestamptz;

create index if not exists idx_medicoes_deleted_at on public.medicoes(deleted_at);

comment on column public.medicoes.deleted_at is 'Soft delete timestamp para MEDLUXBD v1.0.0';
