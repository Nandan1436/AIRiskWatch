# Tooling and Configuration

## TypeScript

1. **`strict: true` from day one**, plus `noUnusedLocals`,
   `noUnusedParameters`, `noFallthroughCasesInSwitch`. Start strict; never
   relax these to make an error disappear — fix the underlying type issue.
2. **`moduleResolution: "bundler"`**, `verbatimModuleSyntax: true`, and
   `noEmit: true` (Vite handles emission) for a Vite + React project.
3. **`noUncheckedSideEffectImports: true`** to catch accidental
   side-effect-only imports.
4. Split `tsconfig.json` (project references) into `tsconfig.app.json`
   (the `src/` app code) and `tsconfig.node.json` (build tooling config
   files like `vite.config.ts`) — keeps app compiler options separate from
   Node-context config files.

## ESLint

1. **Flat config (`eslint.config.js`)**, built from:
   - `@eslint/js` recommended,
   - `typescript-eslint` recommended,
   - `eslint-plugin-react-hooks` recommended (flat),
   - `eslint-plugin-react-refresh` (vite preset).
2. `globalIgnores(["dist"])` at the top of the config; don't hand-maintain
   a separate `.eslintignore`.
3. Run lint via `npm run lint` as part of the standard script set (see
   below) — it must pass with zero warnings before merging.

## Environment variables

1. **One module, `config/env.ts`, is the only place `import.meta.env` is
   read.** Every other file imports a named constant from there
   (`API_BASE_URL`), never `import.meta.env.VITE_...` directly.
2. **Env vars are prefixed `VITE_`** (Vite's requirement to expose them to
   client code) and every constant in `config/env.ts` has a sane local-dev
   fallback so `npm run dev` works without a `.env` file:
   ```ts
   export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api";
   ```
3. Never commit a real `.env` file; commit an `.env.example` documenting the
   expected variable names when a project needs one.

## Imports and aliases

1. **Relative imports by default** (`../../services/storyService`) — no
   path alias is configured out of the box.
2. If a project's folder depth makes relative imports painful, introduce a
   `@/` alias **consistently**: add it to both `tsconfig.app.json`
   (`paths`) and `vite.config.ts` (`resolve.alias`) in the same change, and
   convert the whole codebase, not just new files. Don't let a project run
   with a mix of aliased and relative imports for the same target.

## Standard package.json scripts

Keep this script set as the baseline for any project built from this
template:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```

`build` always type-checks (`tsc -b`) before bundling — never drop the
type-check step to "speed up" a build.

## Styling config

- Tailwind is wired in via `@tailwindcss/vite` plugin in `vite.config.ts`
  plus `@import "tailwindcss";` in `styles/global.css` (Tailwind v4 style).
  A `tailwind.config.js` may still exist for `content` globs and/or
  `theme.extend` if not using the CSS-first `@theme` block.

## Deployment

1. This is a client-side-routed SPA — **the hosting platform must rewrite
   all paths to `/index.html`** so deep links and refreshes work. On
   Vercel that's:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
   Apply the equivalent rewrite rule for whatever host a given project
   actually deploys to.
2. Build output is static (`vite build` → `dist/`) — no server-side
   rendering is assumed anywhere in this architecture. If a future project
   needs SSR, treat that as a stack decision to revisit in
   [01-tech-stack.md](./01-tech-stack.md), not a bolt-on.
