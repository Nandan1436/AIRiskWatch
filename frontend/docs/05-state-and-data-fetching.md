# State and Data Fetching

## Server state — TanStack Query

1. **One `QueryClient`, created once** in `main.tsx`, with the whole `<App />`
   wrapped in a single `<QueryClientProvider>` at the root of the tree.
2. **Every network read is a `useQuery` call inside a `use<Domain>Query.ts`
   hook** — never fetch data with `useEffect` + a service call + manual
   `useState`.
3. **Query key shape:** an array literal, first element the plural resource
   name, remaining elements the parameters that make the result unique, in a
   stable order: `["stories", page, categoryIds, authorId, excludeAuthorId]`.
   Detail/single-item queries use a `"<resource>-detail"` key:
   `["story-detail", storyId]`. Never build query keys dynamically with
   string concatenation — use the array form so React Query can do key
   comparison correctly.
4. **Set `staleTime` deliberately** for lists/detail views that don't need
   to refetch on every mount (a few minutes is a reasonable default for
   semi-static resource data). Don't leave it at the (very aggressive)
   default for anything rendered in a list/feed.
5. **Use `keepPreviousData`/`placeholderData` for paginated queries** so the
   UI doesn't flash empty/loading between pages.
6. **Every write is a `useMutation` call inside a `use<Domain>Mutation.ts`
   hook**, grouped one hook per domain covering all of that domain's write
   operations (create/update/delete/etc. all live together, each as its own
   `useMutation`).
7. **Cache updates on mutation success:**
   - If the mutation response contains the full fresh entity and there's an
     existing detail query for it, use
     `queryClient.setQueryData(["<resource>-detail", id], freshEntity)` to
     update it immediately.
   - Always `queryClient.invalidateQueries({ queryKey: ["<resource>"] })`
     for the list query key so lists refetch and stay consistent.
8. **Mutation hooks accept an optional `onSuccess` callback parameter**
   rather than hardcoding navigation/side-effects inside the hook. This lets
   the same mutation hook be reused from different call sites that need
   different post-success behavior (e.g. navigate to a detail page vs. stay
   and clear a form).
9. **Unwrap the API envelope in the service, not in the hook.** A query/
   mutation hook should receive the plain domain type from the service, not
   a `{ message, data }` wrapper. If a transform is needed (renaming/
   reshaping fields for the UI), do it in a dedicated `utils/transform<Domain>.ts`
   function called from inside the query hook's `queryFn`, not scattered
   across components.
10. **Normalize errors to a string once**, at the hook boundary: expose
    `error: error ? (error as Error).message : null` from query hooks so
    consuming components/containers never need to know about React Query's
    error object shape.

## Client/local state — composed hooks

1. **Form state, field-level validation errors, and one general/top-level
   error message are `useState` inside a `use<Action><Domain>.ts` composed
   hook** — not inside the container, not inside the presentational form
   component.
2. **Validate with a Zod schema** defined in `utils/<domain>Validation.ts`.
   On submit: call `Schema.parse(formData)` inside a `try/catch`; on
   `z.ZodError`, map it to a field → message record with a shared
   `getFieldErrors(error)` helper (one implementation, reused by every
   domain's validation file) and set that as field errors; on any other
   error, set the general error message.
3. **A composed hook's public return shape** should give the container
   everything needed to render and submit a form without the container
   knowing *how* any of it works: `formData`, `setFormData`, `fieldErrors`,
   `generalError`, `isSubmitting`, `onSubmit`. Keep this shape consistent
   across domains so containers are easy to read once you've read one.
4. **Clearing a single field's error on change** is the responsibility of
   the container/component calling `setFieldErrors`, not something the
   validation schema does — keep validation schemas pure and stateless.

## When to add global client state (Context)

Only when a piece of state is read or written from multiple, otherwise
unrelated parts of the app (the canonical example: the authenticated user
and their session token). See [04](./04-architecture-and-data-flow.md) rule 8.
Everything else — including "state shared between a page and its own
container" — should be passed via props/hook return values, not Context.
