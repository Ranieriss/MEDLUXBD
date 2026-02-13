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

### SQL opcional (não executado automaticamente)
No Supabase Dashboard:
1. Clique em **SQL Editor**.
2. Clique em **New query**.
3. Cole e execute o script:

```sql
supabase/migrations/20260213090000_medluxbd_v1_hardening_optional.sql
```

Esse script adiciona `medicoes.deleted_at` para futuras estratégias de soft delete.

### SQL opcional (fundação multi-tenant + soft delete completo)
Para ambientes com RLS por organização (`public.current_org_id()`), execute também:

```sql
supabase/migrations/20260213120000_medluxbd_org_softdelete_foundation_optional.sql
```

Esse script adiciona colunas `organization_id`/`deleted_at` nas entidades principais e cria a função `public.current_org_id()` baseada em `profiles.organization_id`.

### Verificação rápida de release
- Versão exibida no app: `v1.0.0`.
- Página Auditoria deve carregar mesmo com `audit_log` vazio.
- CRUD com validação e confirmações fortes deve estar ativo.

### Smoke test rápido (frontend)
1. `python -m http.server 8000`
2. Abra `http://localhost:8000/`.
3. Faça login com usuário ADMIN e valide:
   - toggle "Mostrar removidos" nas páginas de cadastro;
   - exclusão com confirmação digitando `DELETE`;
   - eventos/erros no menu Auditoria.
