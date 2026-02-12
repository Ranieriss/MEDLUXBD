# MEDLUXBD

Aplicação web estática (HTML/CSS/JS puro) com Supabase (Auth + Postgres + Storage) para gestão de equipamentos, obras, vínculos e medições.

## Stack
- Front-end estático com ES Modules
- Supabase JS (CDN)
- Roteamento por hash (`#/login`, `#/dashboard`, etc.)
- Sem build tools / sem Node obrigatório

## Estrutura
- `index.html` + `404.html` (compatível com GitHub Pages SPA)
- `styles.css`
- `src/` com router, estado, UI, APIs e páginas

## Configuração Supabase
1. Abra `src/config.js`.
2. Preencha `SUPABASE_PUBLISHABLE_KEY` com sua chave publishable completa (`sb_publishable_...`).
3. Mantenha/valide `SUPABASE_URL`:
   - `https://gcmhgyjjinqafbdmuaqy.supabase.co`
4. Se a configuração estiver vazia/placeholder, o app mostra um toast com instruções e bloqueia chamadas da API para evitar erro "Invalid API key".

## Rodar local
```bash
python -m http.server 8000
```
Depois acesse:
- `http://localhost:8000/`

## GitHub Pages
URL esperada:
- `https://ranieriss.github.io/MEDLUXBD/`

O arquivo `404.html` redireciona URLs diretas para `index.html` com hash de rota.

### Ativar o GitHub Pages (evitar 404)
Se o site estiver retornando **404**, normalmente o Pages não está publicado a partir da branch/pasta correta.

No repositório **Ranieriss/MEDLUXBD**, configure exatamente assim:
1. Abra **Settings > Pages**.
2. Em **Build and deployment**, selecione **Deploy from a branch**.
3. Em **Branch**, selecione **main**.
4. Em **Folder**, selecione **/(root)**.
5. Salve e aguarde o deploy concluir.

Checklist rápido:
- `index.html` na raiz do repositório.
- `404.html` na raiz do repositório (fallback para rotas diretas).
- `.nojekyll` na raiz para servir arquivos/pastas sem interferência do Jekyll.
- Repositório público (ou plano com Pages para privado).

## Auth Redirect URLs (Supabase)
No projeto Supabase, configure em **Authentication > URL Configuration**:
- Site URL: `https://ranieriss.github.io/MEDLUXBD/`
- Redirect URLs permitidas:
  - `https://ranieriss.github.io/MEDLUXBD/`
  - `http://localhost:8000/`

## Buckets / Storage
- Bucket esperado: `medlux`
- Upload de termos em:
  - `termos/{obra_codigo}/{equipamento_codigo}/{timestamp}_{filename}`

## Perfis e Roles
- Tabela: `public.profiles`
- Campo esperado: `role` (`ADMIN`/`USER`)
- ADMIN visualiza/edita tudo
- USER vê dados vinculados ao próprio `user_id` e medições próprias

## Diagnóstico
- Erros de API e runtime são exibidos via toast, console e página `#/auditoria`.
- Se `audit_log` não existir, a página mostra “não configurado”.
