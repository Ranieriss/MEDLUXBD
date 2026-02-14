# MEDLUXBD

App estático (HTML/CSS/JS puro, sem build) com autenticação no Supabase e hash routing (`#/login`, `#/dashboard`, `#/update-password`).

## Correção de schema no Supabase (obrigatória)
Os erros `column ... does not exist` indicam que o banco está fora do esperado pelo frontend.

1. Abra o Supabase SQL Editor.
2. Execute o arquivo:

```sql
supabase/migrations/20260212110000_medluxbd_schema_alignment.sql
```

Esse script:
- cria/ajusta tabelas esperadas pelo app (`profiles`, `equipamentos`, `obras`, `vinculos`, `medicoes`, `audit_log`);
- adiciona colunas ausentes (`profiles.id`, `vinculos.encerrou_em`, `audit_log.created_at` etc.);
- habilita RLS e policies básicas para o usuário enxergar os próprios dados (com bypass para `ADMIN`).

## Configuração do Supabase (obrigatória)
No painel do Supabase, abra **Authentication > URL Configuration** e configure:

- **Site URL**
  - `https://ranieriss.github.io/MEDLUXBD`

- **Redirect URLs** (incluir todas)
  - `https://ranieriss.github.io/MEDLUXBD/#/update-password`
  - `https://ranieriss.github.io/MEDLUXBD/#/login`
  - `http://localhost:8000/#/update-password`
  - `http://localhost:8000/#/login`

> Dica: mantenha **exatamente** a rota `#/update-password` nos redirects para o fluxo de recuperação funcionar no GitHub Pages.

## Chaves no frontend
Edite `src/config.js` e preencha:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (prefixo `sb_publishable_`)

> ⚠️ Nunca use `sb_secret` no frontend.

## Testar localmente
Na raiz do projeto:

```bash
python -m http.server 8000
```

Depois abra:

- `http://localhost:8000/`

## GitHub Pages
URL pública:

- `https://ranieriss.github.io/MEDLUXBD/`

O `404.html` da raiz redireciona deep links para `index.html` com hash de rota para manter a SPA funcionando no Pages.

## Release v1.0.0 (hardening)

### O que entra nesta release
- Soft delete obrigatório em `equipamentos`, `obras`, `vinculos` e `medicoes` (sem `DELETE` físico pelo frontend).
- Integridade de vínculo ATIVO (1 vínculo ativo por equipamento, considerando `deleted_at is null`).
- Auditoria e logs padronizados (`audit_log` e `app_logs`) com `correlation_id` e `app_version`.
- Tratamento global de erro para `window.error` e `unhandledrejection`.
- Operação single-tenant (ICD Vias), sem obrigatoriedade de `organization_id` no frontend.

### Como rodar SQL de hardening no Supabase
No Supabase Dashboard:
1. Clique em **SQL Editor**.
2. Clique em **New query**.
3. Execute nesta ordem:

```sql
supabase/migrations/20260212110000_medluxbd_schema_alignment.sql
supabase/migrations/20260213090000_medluxbd_v1_hardening_optional.sql
```

> O banco já possui bloqueio de `DELETE` físico por trigger e suporte a `deleted_at` nas tabelas principais.

### Verificação rápida de release
- Versão exibida no app: `v1.0.0`.
- Página Auditoria deve carregar mesmo com `audit_log` vazio.
- CRUD com validação, soft delete e mensagens amigáveis deve estar ativo.

### Smoke test rápido (frontend)
1. `python -m http.server 8000`
2. Abra `http://localhost:8000/`.
3. Faça login com usuário ADMIN e valide:
   - toggle "Mostrar removidos" nas páginas de cadastro;
   - encerramento/exclusão lógica de vínculos;
   - eventos/erros no menu Auditoria.

## Como configurar `org_id`
1. No Supabase SQL Editor, garanta pelo menos uma organização em `public.organizations`:
   ```sql
   insert into public.organizations (id, nome)
   values (gen_random_uuid(), 'ICD Vias')
   on conflict do nothing;
   ```
2. Defina `public.profiles.org_id` para cada usuário autenticado:
   ```sql
   update public.profiles p
   set org_id = o.id,
       organization_id = o.id
   from public.organizations o
   where o.nome = 'ICD Vias'
     and p.org_id is null;
   ```
3. Rode a migration `supabase/migrations/20260214191000_org_id_rls_without_session_context.sql`.
4. Faça login no app com usuário comum e ADMIN, e valide que listagens (`equipamentos`, `obras`, `vinculos`, `medicoes`) retornam apenas dados da organização correta.
