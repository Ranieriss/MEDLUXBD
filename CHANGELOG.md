# CHANGELOG

## v1.0.0 - Production hardening

- Padronização de timestamps UTC ISO 8601 com utilitários compartilhados (`nowUtcIso`, parse/format seguro).
- Estabilização de queries Supabase com `runQuery` com timeout, mensagens amigáveis e hint para erro de schema.
- Alinhamento de selects para evitar falhas de colunas inexistentes.
- Logger padronizado com níveis INFO/WARN/ERROR e correlation id por sessão/ação.
- Auditoria reforçada para ações CREATE/UPDATE/DELETE/ENCERRAR e eventos de erro.
- Validações consistentes para equipamentos, obras, vínculos e medições antes de persistir.
- Regras server-safe em vínculos (bloqueio de vínculo ATIVO duplicado) e medições (associação de usuário).
- Proteção contra exclusão indevida com confirmação forte e soft delete para equipamentos/obras.
- UI de erro global aprimorada com recarregar/voltar dashboard e detalhes técnicos para ADMIN.
- Versionamento visível em UI e página de auditoria.
- Enriquecimento multi-tenant no frontend com `getCurrentOrgId()` e escrita automática de `organization_id` em create/update/audit.
- Soft delete padronizado para equipamentos/obras/vínculos/medições com fallback para schema legado.
- Tratamento global de erros (401/403/400/42703/rede) com mensagem amigável e detalhes técnicos para ADMIN.

## Checklist manual de validação pós-release

1. Login/logout com usuário comum e ADMIN.
2. Criar/editar equipamento com validação de status.
3. Criar/editar obra com status válido.
4. Criar vínculo e validar bloqueio quando já existir vínculo ATIVO do mesmo equipamento.
5. Encerrar vínculo (status, encerrou_em e encerrado_por preenchidos).
6. Criar medição com usuário vinculado e validar bloqueio para usuário não vinculado.
7. Gerar PDF individual de medição.
8. Tentar exclusões e validar confirmação forte.
9. Abrir Auditoria e verificar:
   - Erros recentes (cliente)
   - Eventos cliente
   - Audit log (Supabase)
10. Confirmar versão `v1.0.0` na UI.
