# Project Structure

## Directory skeleton

```
src/
├── api/                # The single Axios instance + shared API-level types
│   └── apiClient.ts
├── components/          # Presentational (mostly "dumb") components
│   ├── ui/              # Generic, domain-agnostic primitives (Button, Modal, InputField, Pagination...)
│   ├── <domainA>/        # Components specific to one feature domain (e.g. auth/)
│   ├── <domainB>/        # (e.g. feed/, profile/, header/)
│   │   └── <SubGroup>/    # Optional further grouping for a large domain (e.g. feed/Card/, feed/Form/, feed/Sidebar/, feed/Skeletons/)
│   └── index.ts          # Barrel export of every public component
├── config/               # Environment/config access — no business logic
│   └── env.ts
├── constants/            # App-wide constant values
│   ├── index.ts
│   └── <purpose>.ts       # e.g. validationMessages.ts
├── containers/           # Business-logic components that wire hooks to components
│   ├── <Name>Container.tsx
│   ├── <Name>Container.module.css
│   └── index.ts
├── context/               # App-wide React Context providers (cross-cutting state only)
│   ├── <Name>Context.tsx
│   └── index.ts
├── hooks/                 # All stateful logic and data-fetching, grouped by feature
│   ├── <domain>Hooks/       # e.g. authHooks/, storyHooks/, userProfileHooks/
│   │   ├── use<Domain>Query.ts     # read hooks (useQuery wrappers)
│   │   ├── use<Domain>Mutation.ts  # write hooks (useMutation wrappers)
│   │   └── use<Action><Domain>.ts  # composed hooks combining query/mutation + local state
│   └── index.ts
├── interfaces/            # Shared TypeScript types/interfaces, one file per domain
│   ├── api.ts              # generic API envelope types (e.g. ApiResponse<T>)
│   ├── <domain>.ts
│   └── index.ts             # `export * from "./<domain>"` for every domain file
├── pages/                  # One file per route; thin, no business logic
│   ├── <PageName>.tsx
│   └── index.ts
├── routes/                 # Route table + access-control guard components
│   ├── AppRoutes.tsx
│   ├── ProtectedRoute.tsx
│   ├── GuestRoute.tsx
│   └── <Entity>OwnerGuard.tsx
├── services/               # The only layer allowed to call the API client
│   └── <domain>Service.ts
├── styles/
│   └── global.css           # Tailwind import + design tokens
├── utils/                   # Pure, framework-agnostic helper functions
│   ├── <domain>Validation.ts  # Zod schemas + field-error mapping for a domain
│   ├── <domain>Format.ts
│   └── <purpose>Util.ts
├── App.tsx                   # Top-level layout shell (providers, header/footer, route outlet)
└── main.tsx                  # Entry point: React root + top-level providers (QueryClientProvider, etc.)
```

## Rules

1. **Group by feature/domain first, by technical role second.** Inside
   `components/` and `hooks/`, the first-level subfolder is a business domain
   (`auth`, `feed`, `profile`), not a technical category. Inside `services/`,
   `interfaces/`, and `utils/`, the file itself is named after the domain,
   since those layers don't have enough files per domain to warrant folders.
2. **`components/ui/` is the exception** — it holds domain-agnostic,
   reusable primitives (buttons, inputs, modals, pagination) that any domain
   can use. A component only belongs here if it has no knowledge of any
   specific domain's data shape.
3. **Every folder with more than one exported symbol gets an `index.ts`
   barrel** (`components`, `containers`, `pages`, `hooks`, `interfaces`,
   `context`). Import from the folder (`from "../components"`), not the
   individual file, from anywhere outside that folder itself.
4. **Co-locate CSS Modules with the component/container they style**
   (`Button.tsx` + `Button.module.css` in the same directory) — never a
   separate parallel `styles/` tree mirroring the component tree.
5. **`api/` stays at exactly one file** (`apiClient.ts`) unless you're
   integrating a genuinely separate backend/base URL — don't split it up
   per domain; that's what `services/` is for.
6. **New feature domain checklist** — when adding a new domain (e.g. a new
   `comments` feature), create in one pass:
   - `interfaces/comments.ts` (+ export from `interfaces/index.ts`)
   - `services/commentsService.ts`
   - `hooks/commentsHooks/useCommentsQuery.ts`, `useCommentsMutation.ts`
   - `components/comments/*` (+ export from `components/index.ts`)
   - `containers/CommentsContainer.tsx` (+ export from `containers/index.ts`)
   - a route/page only if the domain needs its own route
