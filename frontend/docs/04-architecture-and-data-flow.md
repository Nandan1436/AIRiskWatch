# Architecture and Data Flow

## The layer chain

```
Page  →  Container  →  Component (presentational)
                    ↘
                      Hook (state + data)  →  Service  →  apiClient (Axios)
                                                              ↑
                                                      config/env.ts (base URL)

interfaces/  — shared types, referenced by every layer above
utils/       — pure helpers (validation, formatting), referenced by hooks/containers
context/     — app-wide client state (auth session), referenced by hooks/guards/containers
```

Data and calls only flow **downward/rightward** through this chain. A layer
must never reach past the layer directly below it.

## Rules, one per layer

1. **Pages** (`pages/`) are route endpoints only. A page composes a layout
   (headings, wrapper `<main>`, max-width/padding) and renders exactly one
   container for its business content. **No `useState`, no data fetching, no
   business logic in a page file.** If you find yourself adding either,
   that logic belongs in a container or a hook.

2. **Containers** (`containers/`) own the business logic for a page or a
   self-contained section of a page. A container:
   - calls one or more hooks to get data/handlers,
   - composes and arranges presentational components,
   - contains layout-level JSX and its own `.module.css` for that
     composition,
   - **never calls a service or the apiClient directly** — always through a
     hook.

3. **Components** (`components/`) are presentational. They receive data and
   callbacks via props and render UI; they may hold trivial local UI state
   (an open/closed boolean for a dropdown) but not business/domain state or
   data-fetching. They must not import from `services/` or `api/`.

4. **Hooks** (`hooks/`) are the only place allowed to:
   - call `useQuery`/`useMutation` (which call `services/`),
   - hold form state, validation-error state, and derived loading/submitting
     flags,
   - trigger navigation as a side effect of a successful mutation.

   Split hooks by responsibility, not by convenience:
   - `use<Domain>Query.ts` — read-only, wraps `useQuery`, returns already
     unwrapped/transformed data plus `isLoading`/`error`.
   - `use<Domain>Mutation.ts` — wraps `useMutation` for every write
     operation on that domain (create/update/delete/etc.), handles cache
     invalidation, accepts an optional `onSuccess` callback so the caller
     controls side effects like navigation.
   - `use<Action><Domain>.ts` — the hook a container actually calls. Composes
     the query/mutation hooks above with local form state, calls the
     validation schema from `utils/`, and exposes a single `onSubmit`/`handleX`
     surface plus the data the form/UI needs.

5. **Services** (`services/`) are the **only** code allowed to import and
   call the shared `apiClient`. A service function:
   - takes typed parameters and returns a typed, already-unwrapped domain
     object (unwrap the `{ message, data }` API envelope inside the service,
     not in the hook or component),
   - contains no React, no hooks, no UI concerns — it must be usable from a
     plain script or a test with no React tree.

6. **`api/apiClient.ts`** is a single Axios instance, created once, exported
   as the default export. It owns:
   - `baseURL` sourced from `config/env.ts` (never inline a URL here or
     anywhere else),
   - a request interceptor that attaches the auth token from storage,
   - a response interceptor that normalizes every failure into a plain
     `Error` with a human-readable `message`, so every calling layer can do
     `catch (err) { err.message }` without knowing about Axios/HTTP shapes.

7. **`interfaces/`** is the single source of truth for domain shapes.
   Define a type once per domain file; every other layer imports it from
   there. Don't redeclare an inline shape in a component's props or a
   service's return type that duplicates a domain interface — extend/reuse
   instead (`Partial<CreateStoryData>`, `Pick<Story, "title" | "body">`).

8. **`context/`** is reserved for state that is genuinely global and
   long-lived across the whole app (authenticated user/session, theme). It
   is not a dumping ground for feature state — if only one page/container
   tree needs a piece of state, it belongs in a hook or that container, not
   in Context. A context module exports its `Provider` and a `use<Name>`
   accessor hook that throws when called outside the provider, so misuse
   fails immediately instead of silently returning `undefined`.

9. **`utils/`** functions are pure: same input, same output, no network
   calls, no reading from Context/localStorage. Validation schemas
   (Zod) and their field-error mapping helpers live here, one file per
   domain, so both a hook and (if needed) a service can reuse the same
   schema.

## Anti-patterns to reject in review

- A component importing from `services/` or `api/` directly.
- A page with `useState`/`useEffect` driving business logic instead of
  delegating to a container + hook.
- A service function that returns the raw Axios response instead of the
  unwrapped domain type.
- Duplicated interface definitions for the same domain entity in more than
  one file.
- New global state pushed into Context when it's only consumed by one
  feature tree.
