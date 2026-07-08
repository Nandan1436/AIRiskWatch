# Routing and Access Control

## Structure

1. **One central route table**: `routes/AppRoutes.tsx`, listing every route
   in a single `<Routes>` tree. Don't scatter `<Route>` definitions across
   multiple files.
2. **Pages are imported from the `pages` barrel**, never from their
   individual files, inside `AppRoutes.tsx`.
3. **Access control is expressed as nested layout routes**, not per-page
   `if` checks:
   ```tsx
   <Route element={<ProtectedRoute />}>
     <Route path="/things/create" element={<CreateThingPage />} />
     <Route element={<ThingOwnerGuard />}>
       <Route path="/things/:thingId/edit" element={<EditThingPage />} />
     </Route>
   </Route>
   ```
   A guard component renders `<Outlet />` when the check passes, or
   `<Navigate>` when it doesn't. Pages inside a guarded branch have zero
   auth-checking code of their own.
4. **Unmatched routes (`path="*"`) redirect** to the app's default/home
   route rather than rendering a blank/error page.

## Guard archetypes

| Guard | Purpose | Behavior |
|---|---|---|
| `ProtectedRoute` | Route requires an authenticated user | If auth is still loading, render `null` (don't flash a redirect). If authenticated, `<Outlet />`. Otherwise `<Navigate to="/signin" state={{ from: location }} replace />` so the sign-in flow can return the user to where they came from. |
| `GuestRoute` | Route requires the user to be **unauthenticated** (sign in / sign up pages) | If authenticated, redirect away (e.g. to the app's home/feed). Otherwise `<Outlet />`. |
| `<Entity>OwnerGuard` | Route requires the user to both be authenticated **and** own the specific resource identified by a route param | Read the id from `useParams`, fetch the entity via its existing detail query hook (don't write a new fetch just for the guard), compare `entity.ownerId` to the current user's id from `useAuth()`. Redirect away on not-found, error, or non-ownership. |

## Rules

1. **Guards read session state exclusively from the auth Context's
   `useAuth()` hook** — never read `localStorage` directly outside
   `AuthContext`/`apiClient`.
2. **Guards must handle the auth-loading state explicitly** (render `null`
   or a loading state) before deciding to redirect, so a page doesn't
   briefly redirect-then-un-redirect while the session is still hydrating
   from storage on first load.
3. **Ownership guards reuse the same detail-fetching hook the page itself
   would use** — don't duplicate a fetch just to check ownership; let the
   guard's `<Outlet />` render the page, which will then get a cache hit
   from TanStack Query for the same query key.
4. **Route paths mirror resource nesting**: collection at `/things`, item at
   `/things/:thingId`, item actions as suffixes (`/things/:thingId/edit`),
   top-level create actions as a static suffix on the collection
   (`/things/create`).
5. **Session persistence**: store the auth token and minimal user info in
   `localStorage`, written/cleared only from the `login`/`logout` functions
   exposed by the auth Context. Hydrate on app mount inside a `useEffect` in
   the Context provider, with an `isLoading` flag that gates the guards
   described above.
