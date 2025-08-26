# Repository Guidelines

## Project Structure & Module Organization
- Source: `src/` (React + TypeScript). Key areas: `src/routes/` (TanStack Router pages), `src/components/`, `src/lib/`, `src/db/` (Drizzle ORM: `schema.ts`, `client.ts`, `seed.ts`).
- Config: `vite.config.ts`, `tsconfig.json`, `drizzle.config.ts`, `biome.jsonc`.
- Database: migrations in `drizzle/migrations`; local Postgres via `docker-compose.yml`.
- Environment: `.env`, `.env.example`, `.env.testing`, `.env.production`. Required: `DATABASE_URL`.

## Build, Test, and Development Commands
- `pnpm dev`: Start Vite/TanStack Start dev server at port 3000.
- `pnpm dev:full`: Start Postgres (Docker) and open Drizzle Studio alongside dev.
- `pnpm build`: Run DB migrations then build the app for production.
- `pnpm start`: Run the built server (`.output/server/index.mjs`).
- `pnpm test`: Run unit tests with Vitest.
- Database helpers: `pnpm db:up`, `db:down`, `db:migrate`, `db:studio`, `db:seed`.
- Formatting/Linting: `pnpm format`, `pnpm lint`, `pnpm check` (Biome).

## Coding Style & Naming Conventions
- Language: TypeScript, React 19, Tailwind CSS.
- Formatting: Biome enforces tabs for indentation and double quotes. Run `pnpm format` before commits.
- React: Components `PascalCase` (e.g., `UserCard.tsx`); hooks `useX`.
- Imports: Prefer path aliases like `@/components/...` per `tsconfig.json`.
- Routes: Use TanStack file routes in `src/routes/` (e.g., `__root.tsx`, `index.tsx`).

## Testing Guidelines
- Framework: Vitest.
- Location: Co-locate tests near code using `*.test.ts`/`*.test.tsx` (e.g., `src/lib/foo.test.ts`).
- Run: `pnpm test`. Aim for meaningful unit tests around db queries, utils, and route loaders/actions.

## Commit & Pull Request Guidelines
- Commits: Imperative, concise subject (e.g., "Refactor form data version handling"). Include context in body and reference issues when applicable.
- PRs: Include summary, screenshots for UI changes, migration notes (if Drizzle changes), test plan, and linked issues.
- Keep PRs focused; update `.env.example` when adding config.

## Security & Configuration Tips
- Do not commit secrets. Keep `.env.example` updated.
- Local DB: `pnpm db:up` (Docker) and set `DATABASE_URL` accordingly.
- Migrations: Use `pnpm db:generate` and `pnpm db:migrate`; inspect with `pnpm db:studio`.
