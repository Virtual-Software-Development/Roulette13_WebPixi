# React + TypeScript + Vite

## Local development

Everything (Go backend, game app, admin panel) starts with one command:

```
npm run dev:all
```

| Process | URL | Notes |
|---------|-----|-------|
| BACKEND | http://localhost:3000 (the backend's `HTTP_PORT`) | Starts PostgreSQL if needed, applies migrations, rebuilds/restarts on backend changes |
| APP     | http://localhost:5173 | Game frontend; `/api` is proxied to the backend as `/api/v1` |
| ADMIN   | http://localhost:4100 | Admin panel; `/api` and `/media` go through the APP |

Requirements:

- `quick-money-backend` cloned **next to** this repo
  (`../quick-money-backend`), with its `.env` created from `.env.example`. Another location: set `BACKEND_DIR`.
- Go on `PATH`, and PostgreSQL installed. If it isn't running and `DB_HOST` is local, dev:all starts
  it: the Windows `postgresql*` service (a UAC prompt appears if you're not an administrator), or
  else the backend's `deploy/docker-compose.yml` `postgres` service when Docker is available.
  Set `DEV_START_DB=0` to turn this off.
- `local-media/` copied into this repo (it is git-ignored).

`npm install` runs automatically (root and `admin/`) when a lockfile changes, e.g. after a pull.
All ports and URLs come from `scripts/lib/devEnv.mjs`, which reads the backend's own `.env` --
change `HTTP_PORT`/`DB_*` there, not here. Without a backend checkout the two frontends still start.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
