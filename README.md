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
2. Substitua `supabaseAnonKey` pela sua chave publishable (`sb_publishable_...`).
3. Mantenha a URL já configurada:
   - `https://gcmhgyjjinqafbdmuaqy.supabase.co`

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
