# New Project Checklist

Work through this top to bottom when bootstrapping a new frontend project
from this template.

## 1. Scaffold

- [ ] `npm create vite@latest <project-name> -- --template react-ts`
- [ ] Install the standard dependency set from
      [01-tech-stack.md](./01-tech-stack.md): `react-router-dom`,
      `@tanstack/react-query`, `axios`, `zod`, `tailwindcss` +
      `@tailwindcss/vite`.
- [ ] Install dev dependencies: `@tanstack/eslint-plugin-query`,
      `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`,
      `typescript-eslint`.

## 2. Config

- [ ] Set `strict: true` + the other strictness flags in
      `tsconfig.app.json` (see [08](./08-tooling-and-config.md)).
- [ ] Set up `eslint.config.js` as a flat config per
      [08-tooling-and-config.md](./08-tooling-and-config.md).
- [ ] Wire Tailwind into `vite.config.ts` and `styles/global.css`, define
      the project's real design tokens in the `@theme` block (or
      `tailwind.config.js`) — don't leave placeholder colors in place.
- [ ] Create `config/env.ts` with the project's actual env var names and
      local-dev fallbacks.
- [ ] Add the hosting platform's SPA rewrite config (e.g. `vercel.json`).

## 3. Skeleton

- [ ] Create the empty folder skeleton from
      [02-project-structure.md](./02-project-structure.md):
      `api/`, `components/ui/`, `config/`, `constants/`, `containers/`,
      `context/`, `hooks/`, `interfaces/`, `pages/`, `routes/`,
      `services/`, `styles/`, `utils/`.
- [ ] Add `api/apiClient.ts` with the base Axios instance + request/response
      interceptors described in
      [04-architecture-and-data-flow.md](./04-architecture-and-data-flow.md).
- [ ] Add `interfaces/api.ts` with the shared API envelope type
      (`ApiResponse<T>`) matching the backend's actual response shape.
- [ ] Set up `main.tsx` with `QueryClientProvider` wrapping `<App />`.
- [ ] Set up `App.tsx` with the top-level layout shell and provider nesting
      (auth provider outside the router if auth state is needed in guards).

## 4. First feature domain (proves the pattern end-to-end)

Pick the simplest real domain in the new project and build it fully before
adding a second one, to validate the pattern fits:

- [ ] `interfaces/<domain>.ts`
- [ ] `services/<domain>Service.ts`
- [ ] `hooks/<domain>Hooks/use<Domain>Query.ts` and `use<Domain>Mutation.ts`
- [ ] `utils/<domain>Validation.ts` (Zod schema + `getFieldErrors`) if the
      domain has a form
- [ ] `hooks/<domain>Hooks/use<Action><Domain>.ts` composed hook (if a form)
- [ ] `components/<domain>/*` presentational pieces
- [ ] `containers/<Name>Container.tsx`
- [ ] `pages/<Name>.tsx` + route entry in `routes/AppRoutes.tsx`
- [ ] Barrel (`index.ts`) updates in every folder touched

## 5. Auth (if the project needs it)

- [ ] `context/AuthContext.tsx` with `AuthProvider` + `useAuth`
- [ ] `routes/ProtectedRoute.tsx`, `routes/GuestRoute.tsx`
- [ ] Any `<Entity>OwnerGuard.tsx` needed once resource ownership matters
- [ ] Auth token attached in the Axios request interceptor in
      `api/apiClient.ts`

## 6. Verify the rules stuck

- [ ] `npm run lint` passes clean.
- [ ] `npm run build` passes (type-checks + bundles).
- [ ] Spot-check: no component imports from `services/` or `api/` directly.
- [ ] Spot-check: no page has its own `useState`/business logic.
- [ ] Spot-check: every domain has exactly one interfaces file, no
      duplicated inline type shapes.
