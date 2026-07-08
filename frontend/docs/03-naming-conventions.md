# Naming Conventions

## Files and exports

| Thing | File naming | Export naming | Example |
|---|---|---|---|
| Component | `PascalCase.tsx`, one component per file, filename == export name | `export function ComponentName(...)` | `Button.tsx` → `Button` |
| Component styles | `<ComponentName>.module.css`, same folder as the component | n/a (imported as `styles`) | `Button.module.css` |
| Container | `<Name>Container.tsx` | `export function <Name>Container(...)` | `StoryFormContainer.tsx` |
| Page | `<Name>.tsx` in `pages/`, file name does **not** need a `Page` suffix | barrel re-exports as `<Name>Page` when the bare name is ambiguous with a domain entity (e.g. `StoryDetails.tsx` → exported as `StoryDetailPage`); keep the bare name (e.g. `SignIn`) when it's already unambiguous | `FeedPage.tsx` → `FeedPage`; `CreateStory.tsx` → `CreateStoryPage` |
| Hook | `camelCase.ts`, always prefixed `use` | `export function useThing(...)` | `useCreateStory.ts` |
| Hook — read (query) | `use<Domain>Query.ts` | one export per query, e.g. `useGetAll<Domain>`, `use<Domain>Detail` | `useStoryQuery.ts` |
| Hook — write (mutation) | `use<Domain>Mutation.ts` | `use<Domain>Mutation` returning `handleCreate`/`handleUpdate`/`handleDelete`-style functions | `useStoryMutation.ts` |
| Hook — composed/form | `use<Action><Domain>.ts` | `export function use<Action><Domain>()`, combines query/mutation + local `useState` + validation + navigation | `useCreateStory.ts`, `useSignIn.ts` |
| Service | `<domain>Service.ts`, camelCase | plain async functions named after the HTTP action + resource: `create<Domain>`, `get<Domain>ById`, `update<Domain>`, `delete<Domain>` | `storyService.ts` |
| Interface/type file | `<domain>.ts`, camelCase, lowercase | `export interface Thing`, `export type Thing` — PascalCase names | `story.ts` → `Story`, `CreateStoryData` |
| Utility | `<domain><Purpose>.ts` (`Validation`, `Format`, `Util`) | named exports, verbs for functions (`validateX`, `transformX`, `formatX`) | `storyValidation.ts`, `paginationUtil.ts` |
| Context | `<Name>Context.tsx` | exports a `<Name>Provider` component and a `use<Name>` hook | `AuthContext.tsx` → `AuthProvider`, `useAuth` |
| Route guard | `<Purpose>Route.tsx` for generic access rules, `<Entity>Guard.tsx` for entity-ownership rules | `export function <Purpose>Route()` / `<Entity>Guard()` | `ProtectedRoute.tsx`, `GuestRoute.tsx`, `StoryOwnerGuard.tsx` |
| Constants file | `camelCase.ts` | `export const SCREAMING_SNAKE_CASE` values, grouped in an object when related | `validationMessages.ts` → `VALIDATION_MESSAGES` |

## Code-level naming rules

1. **Components, types, and interfaces:** `PascalCase`.
2. **Functions, variables, hooks, props:** `camelCase`.
3. **Constants (module-level, unchanging config/message values):**
   `SCREAMING_SNAKE_CASE`, usually grouped under one namespaced object
   (`VALIDATION_MESSAGES.TITLE_MIN_LENGTH`) rather than many loose exports.
4. **CSS Module class names:** `camelCase` (`.variantPrimary`, `.sizeSm`,
   `.fieldSection`) — never `kebab-case` inside a module file, so class names
   read as plain object property access (`styles.variantPrimary`).
5. **Boolean props/state:** prefix with `is`/`has`/`should`
   (`isLoading`, `isSubmitting`, `hasValidationErrors`, `isEdit`).
6. **Handlers:** prefix with `handle` for functions passed as the
   implementation of an event (`handleSubmit`, `handleCreate`,
   `handleAddCategory`); prefix with `on` for the **prop** a component
   accepts (`onChange`, `onRegenerate`, `onAddCategory`). A component's
   `onX` prop is typically wired to a container's `handleX` function.
7. **Query keys** (TanStack Query): a plain array, first element is the
   **plural resource name** as a string (`"stories"`), followed by whatever
   parameters make the query unique, in a stable order:
   `["stories", page, categoryIds, authorId]`. Detail queries use a
   `"<resource>-detail"` first element: `["story-detail", storyId]`.
8. **Route paths:** lowercase, kebab-case, plural for collections
   (`/stories`), singular nested with an ID param for a specific resource
   (`/stories/:storyId`), verb suffix for actions (`/stories/create`,
   `/stories/:storyId/edit`).
9. **Don't abbreviate domain nouns.** Use the same full word for a concept
   everywhere it appears (interfaces, services, hooks, routes) — if the
   backend calls it `story`, every layer calls it `story`, not `post` in one
   place and `article` in another.
