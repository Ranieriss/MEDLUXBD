# CHANGELOG

## v1.0.0 - Produção estável (hardening interno)

- Soft delete padronizado para `equipamentos`, `obras`, `vinculos` e `medicoes` com filtro padrão `deleted_at IS NULL` nas listagens.
- Remoção de exclusões físicas (`.delete()`) nas tabelas principais do frontend.
- Integridade reforçada de vínculo ATIVO: bloqueio prévio no frontend/backend com erro amigável (`INTEGRITY_ACTIVE_VINCULO_DUPLICATE`).
- Auditoria padronizada com payload consistente em `audit_log` e severidade `WARN` para ações destrutivas.
- Logs padronizados no cliente com `correlation_id`, `route`, `app_version` e envio best-effort para `public.app_logs`.
- Tratamento global de erro definitivo para `window.error` e `unhandledrejection`, com detalhes técnicos apenas para ADMIN.
- Release final single-tenant (ICD Vias), sem obrigatoriedade de `organization_id` no frontend.

## Checklist manual de validação pós-release

1. Login/logout com usuário comum e ADMIN.
2. Criar/editar equipamento com validação de status.
3. Criar/editar obra com status válido.
4. Criar vínculo e validar bloqueio quando já existir vínculo ATIVO do mesmo equipamento.
5. Encerrar vínculo (status, encerrou_em e encerrado_por preenchidos).
6. Criar medição com usuário vinculado e validar bloqueio para usuário não vinculado.
7. Gerar PDF individual de medição.
8. Executar exclusão lógica e validar `deleted_at` preenchido.
9. Abrir Auditoria e verificar erros/eventos/audit log.
10. Confirmar versão `v1.0.0` na UI.
