# Tech Stack

The default stack for a new frontend project built from this template. Keep
this exact set unless there's a specific reason to deviate — consistency
across projects is the point.

| Concern | Choice | Rule |
|---|---|---|
| Build tool | Vite | Use the `react-ts` Vite template as the starting point. |
| UI library | React (latest major) | Function components + hooks only. No class components. |
| Language | TypeScript, `strict: true` | Never loosen strictness to silence an error — fix the type instead. |
| Routing | React Router | Declarative `<Routes>`/`<Route>` tree, nested layout routes for guards (see [07](./07-routing-and-auth.md)). |
| Server state | TanStack Query (React Query) | All network data goes through `useQuery`/`useMutation`. Never `useEffect` + `fetch` for data loading. |
| HTTP client | Axios | One shared instance (`api/apiClient.ts`), never instantiate Axios elsewhere. |
| Styling | Tailwind CSS + CSS Modules | Utility classes via `@apply` inside co-located `*.module.css` files (see [06](./06-styling-guidelines.md)). |
| Schema validation | Zod | Form/DTO validation schemas, one per domain, colocated in `utils/`. |
| Package manager | npm | `package-lock.json` committed. |

## Rules

1. **Prefer the latest stable major version** of each library when starting a
   new project rather than pinning to whatever this template last used —
   re-verify breaking changes (especially Tailwind and React Router, which
   change API shape between majors) before copying config files verbatim.
2. **Don't add a new top-level dependency for something one of the above
   already solves.** E.g. don't add `react-hook-form` if the project already
   has a `useState` + Zod pattern working — see [05](./05-state-and-data-fetching.md).
3. **Don't reach for global state libraries (Redux, Zustand, Jotai) by
   default.** Server state lives in TanStack Query's cache; the only client
   state that needs sharing app-wide (auth session, theme) goes in a React
   Context (see [04](./04-architecture-and-data-flow.md)). Add a state library
   only when multiple unrelated feature areas need to share client-only state
   and prop-drilling/context has genuinely become unwieldy.
4. **Markdown rendering, date libraries, etc.** — add narrowly-scoped utility
   libraries as needed per project, but keep them out of the core layering
   rules below.
