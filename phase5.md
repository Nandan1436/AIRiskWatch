> **Status: in progress (5 Oct 2026)** on branch `feat-user-accounts-and-admin`.
> Scope was narrowed during planning: only register / login / logout ship in
> this phase. Forgot/reset password, change password, delete account and SMTP
> are deferred to the monthly-email phase.

# Phase 5: User accounts, authentication and admin panel

## Context

The app is fully public and has no concept of a user. Phase 5 adds accounts so
that a later phase can send each user a monthly risk-summary email. The site
stays fully usable without logging in. Logging in only gives a user an account
page, and later the email subscription. Admins get a panel to manage users, run
ingestion, and do CRUD on incidents and reports.

Decisions taken with the user:
- Login works two ways: email/password, and Google.
- The session is a **Bearer JWT kept in localStorage**.
- The first admin is created with a **CLI script**.
- Account flows in this phase: **register, login and logout only.** Forgot/reset password, change password, delete account and any SMTP work are deferred to a later phase. The schema leaves room for them.
- The admin panel covers users, a "run ingestion" button, and incident/report CRUD.

This reverses `AIRiskWatch_Design_Decisions_2026-08-01.md:57`, which said "no admin role". Record that reversal in the docs.

Timeline: the 11 Oct demo is close. Milestones are ordered so that if time runs out, the cut comes from the end (admin CRUD), not from login or the account page.

## Step 0: Prerequisites and docs
- Write `phase5.md` at the repo root (same style as `phase2.md` and `phase4.md`). It holds this plan plus the reasoning behind it.
- In the design-decisions doc, add a dated note that the admin role was introduced in Phase 5.
- Fix `backend/scripts/apply_migrations.py` to connect with `app.config.DATABASE_URL` (Neon) instead of the `POSTGRES_*` variables. This is the known CLAUDE.md gotcha, and it blocks applying the new migration.
- Add these packages to `requirements.txt`:
  - `bcrypt` (passlib is unmaintained)
  - `PyJWT`
  - `google-auth` and `requests` (Google ID-token verification)
  - `email-validator` (pydantic `EmailStr`)

## Step 1: Database
**New migration `db/migrations/003_add_user_accounts.sql`** (idempotent, `IF NOT EXISTS`). Mirror it in `db/schema.sql`.

```sql
CREATE TABLE IF NOT EXISTS "user" (             -- reserved word: always double-quote in raw SQL
    id                   SERIAL PRIMARY KEY,
    email                TEXT NOT NULL UNIQUE,  -- stored lower-cased
    username             TEXT NOT NULL UNIQUE,
    password_hash        TEXT,                  -- NULL for Google-only accounts
    google_sub           TEXT UNIQUE,           -- NULL for password-only accounts
    role                 TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    email_notifications  BOOLEAN NOT NULL DEFAULT TRUE,  -- consumed by the later monthly-email phase
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

The password-reset table comes in the later phase as migration 004.

**Model.** Add `app/models/user_model.py` (`User`) and re-export it in `app/models/__init__.py`. Follow the `Mapped[...]` style used in `incident_model.py`.

## Step 2: Backend core
- **`app/config.py`.** Add `JWT_SECRET`, `JWT_ALGORITHM=HS256`, `JWT_EXPIRE_MINUTES=1440` and `GOOGLE_CLIENT_ID`. Add each one to `.env.example`, along with the missing `CORS_ORIGINS`.
- **`app/core/security.py`.** Pure functions:
  - `hash_password` and `verify_password` (bcrypt)
  - `create_access_token(user_id, role)`, with `sub`, `role`, `iat` and `exp`
  - `decode_access_token`
- **`app/core/google_auth_client.py`.** `verify_google_id_token(credential)` wraps `google.oauth2.id_token.verify_oauth2_token(...)` with `audience=GOOGLE_CLIENT_ID`. It returns `sub`, `email`, `email_verified` and `name`. If verification fails, it raises `GoogleAuthError(RuntimeError)`.
- **`app/routes/auth_dependencies.py`.** Shared FastAPI dependencies:
  - `get_current_user`: reads the `HTTPBearer` token, decodes it, loads the `User` row, and checks `is_active`. Any failure returns 401.
  - `get_optional_user`: kept for future personalisation.
  - `require_admin`: returns 403 with "Insufficient permissions" for non-admins.

  Loading the user on every request means deactivation, role changes and deletion take effect immediately, even though the JWT is stateless.

## Step 3: Backend services, schemas and routes
Follow the existing chain: `<x>_schema.py`, then the `<X>Service(db)` class, then `<x>_route.py` with its `get_<x>_service` factory, registered in `main.py`.

- Services raise `RuntimeError` subclasses (`AuthError`, `UserConflictError`, ...).
- Routes translate them to HTTP codes as described in `backend/docs/error_handling.md`: 401 for bad credentials, 409 for email or username already in use.
- Logout is client-side only: the frontend drops the token. Tokens are stateless, so there is no logout endpoint.

**`AuthService`, `/api/auth`**

| Method | Path | Notes |
|---|---|---|
| POST | `/register` | email, username, password (min 8). Returns `{access_token, user}` |
| POST | `/login` | email + password. Same message for an unknown email and a wrong password |
| POST | `/google` | `{credential}`, which is the Google ID token. Finds the user by `google_sub`. If none matches, it links to an existing account with the same verified email. Otherwise it creates a user, with a username derived from the email's local part plus a numeric suffix if that name is taken |

**`UserService`, `/api/users/me`** (requires `get_current_user`)

| Method | Path | Notes |
|---|---|---|
| GET | `/me` | `UserResponse`: id, email, username, role, has_password, has_google, email_notifications, created_at |
| PATCH | `/me` | username, email_notifications |

**`AdminService`, `/api/admin`** (every route requires `require_admin`)
- **Users**
  - `GET /users` is paginated and searchable by email or username, and returns `{items,total,limit,offset}` like `IncidentListResponse`.
  - `PATCH /users/{id}` sets role and is_active. An admin cannot demote or deactivate themselves (returns 400).
- **Ingestion.** Put `require_admin` on the existing `POST /api/ingestion/run` in `app/routes/ingestion_route.py`; there is no new endpoint. It stays synchronous, so the UI shows a spinner and then the returned `IngestionRunResponse`.
- **Incidents**
  - `POST /incidents`, `PATCH /incidents/{incident_id}`, `DELETE /incidents/{incident_id}`.
  - Create and update recompute `embedding = embed_text(incident_embedding_input(title, description))` (`app/core/embedding_client.py`), so search and dedup stay consistent (CLAUDE.md invariant).
  - Create allocates `incident_id` as MAX + 1, which is only safe under the ingestion lock. So it takes `SELECT pg_try_advisory_xact_lock(_ADVISORY_LOCK_KEY)` in its own transaction, and returns 409 "Ingestion is running, try again shortly" if the lock is held. To make this reusable, expose a small public `allocate_next_id(db, column)` and the lock key in `ingestion_service.py`.
  - Delete removes the incident's `mit_classification` row and `incident_report` links, then the incident. Reports stay, and the admin can delete them separately.
  - New incidents are left unclassified. `run_classification.py --mode backfill` picks them up.
- **Reports**
  - `GET /reports` is a paginated list; there is no public list endpoint today.
  - `POST /reports`, `PATCH /reports/{report_number}`, `DELETE /reports/{report_number}`.
  - Create and update take `incident_ids: list[int]` and replace the links in `incident_report`.
  - If `source_domain` is left blank, it is filled from the URL with `urlparse`.
  - `report_number` is allocated the same way as `incident_id`, under the lock.
- Incident listing for the admin page reuses the public `GET /api/incidents/` and `GET /api/incidents/{id}`.

Every other existing route stays public.

**`backend/scripts/create_admin.py`.**
- Arguments: `--email`, `--username`. It prompts for the password with `getpass`.
- If the user exists, it promotes them to admin; otherwise it creates them.
- It reuses `security.hash_password`.

## Step 4: Frontend
Follow `frontend/docs/`: Page → Container → Component, and Container → Hook → Service → apiClient. Zod handles validation.

- **Dependencies.** `npm i zod @react-oauth/google`.
- **Env.** Add `VITE_GOOGLE_CLIENT_ID` to `.env.example`, and export it from `src/config/env.ts`.
- **Interfaces.** `src/interfaces/auth.ts` and `user.ts` (`User`, `AuthResponse`, request types), plus `admin.ts`. Register them in the barrel.
- **API client** (`src/api/apiClient.ts`).
  - A request interceptor attaches `Authorization: Bearer <token>`, read from localStorage key `airiskwatch-auth`.
  - On a 401 response it clears that key and dispatches `window` event `auth:logout`.
  - This file and AuthContext are the only places that touch the key (doc 07 rule).
- **`src/context/AuthContext.tsx`.** Copy the `ThemeContext` pattern.
  - Exposes `user`, `token`, `isAuthenticated`, `isAdmin`, `isLoading`, `login(authResponse)`, `logout()` and `refreshUser()`.
  - On mount it hydrates by calling `GET /api/users/me` when a token is present.
  - It listens for `auth:logout`.
  - In `App.tsx`, wrap the tree in `GoogleOAuthProvider` and then `AuthProvider`.
- **Services.** `authService.ts`, `userService.ts` and `adminService.ts`.
- **Hooks.**
  - `hooks/authHooks/`: `useSignIn`, `useSignUp`, `useGoogleSignIn`. These are form hooks with `formData`, `fieldErrors`, `generalError`, `isSubmitting` and `onSubmit`, and they use Zod schemas from `utils/authValidation.ts`.
  - `hooks/userHooks/`: `useUpdateProfile`.
  - `hooks/adminHooks/`: `useAdminUsersQuery`, `useUpdateUserMutation`, `useRunIngestionMutation`, `useIncidentMutations`, `useAdminReportsQuery`, `useReportMutations`. On success they invalidate `["incidents"]`, `["incident-detail", id]` and `["admin-reports"]`.
- **Route guards** in `src/routes/`, all as `<Outlet/>` layout routes per doc 07:
  - `ProtectedRoute`, `GuestRoute`, and `AdminRoute` (checks `isAdmin`).
  - Each renders `null` while `isLoading`.
- **Routes** in `AppRoutes.tsx`. All existing routes stay public.
  - Guest: `/sign-in`, `/sign-up`
  - Protected: `/account`
  - Admin: `/admin` (redirects to `/admin/users`), `/admin/users`, `/admin/ingestion`, `/admin/incidents`, `/admin/reports`
- **Pages and containers.**
  - `SignIn` and `SignUp`: an email/password form, an "or" divider, and the Google button (`<GoogleLogin onSuccess={c => googleSignIn(c.credential)} />`).
  - `Account` has two cards:
    - Profile: username (editable), email (read-only), role, member-since date, and sign-in method badges (Password / Google).
    - Email notifications: a monthly-summary toggle with a "coming soon" note.

    The page also has a Sign out button. Password and delete-account cards come in the later phase.
  - `Admin` uses a tab layout for Users, Ingestion, Incidents and Reports:
    - Users: a table with role and active toggles.
    - Ingestion: a "Run ingestion" button and a run-summary card.
    - Incidents: reuse `useIncidentQuery` for the list, with edit and delete actions and a create/edit form for title, description, date, and the deployer/developer/harmed-party lists.
    - Reports: a list plus a create/edit form that includes linked incident IDs.
- **`Sidebar.tsx`.**
  - Add an account block above the Appearance block. Logged out, it shows a "Sign in" button. Logged in, it shows the username, an Account link and Sign out.
  - Add an "Admin" `NAV_ITEMS` entry, shown only when `isAdmin`.
- **Styling.** Use the existing tokens and CSS-module patterns, with no hard-coded hex values.

## Step 5: Docs
- **`CLAUDE.md`**
  - Replace "The frontend has no auth" with the actual auth model: Bearer JWT, the guards, admin via `create_admin.py`.
  - Note that `POST /api/ingestion/run` is admin-only.
  - Note that `apply_migrations.py` now uses `DATABASE_URL`.
- **`backend/.env.example`.** Add the Google Cloud setup notes:
  - Create a Web OAuth client.
  - Set the authorized JavaScript origins to `http://localhost:5173` and `http://127.0.0.1:5173`.
  - Use the same client ID for `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`.

## Milestones and commits
Commit style: one-line conventional messages, split by concern, no co-author trailer.
1. Docs, the migration-script fix, the migration and models: `doc: add phase 5 plan`, `fix: apply migrations against DATABASE_URL`, `feat: add user account tables`
2. Backend auth and account endpoints, and `create_admin.py`: `feat: add email and google authentication`, `feat: add account profile endpoints`
3. Frontend auth, account page and sidebar: `feat: add sign-in and sign-up pages`, `feat: add account page`
4. Admin backend and frontend: users and ingestion first, then incident/report CRUD. CRUD is the first thing to cut if time runs short. Commits: `feat: add admin user management`, `feat: add admin incident and report crud`

## Verification
There are no tests and no lint in this repo, so checks are compile and build plus manual runs.
- **Backend compile.** `python -m py_compile` on the new and changed files. Run the `app.main` import check in the background, because it loads the embedding model.
- **Migration.** Run `python scripts/apply_migrations.py` twice; the second run must be a no-op. Check the tables in the Neon SQL editor.
- **Backend flows.** With `uvicorn app.main:app --reload`, go through these in `/docs`:
  - register, login, and `GET /api/users/me` with the token
  - patch the username and the notifications flag
  - a duplicate email or username returns 409, and a wrong password returns 401
  - `POST /api/ingestion/run` without a token returns 401, and as a non-admin returns 403
- **Admin.**
  - `python scripts/create_admin.py --email ...`, then sign in as that user.
  - In the admin panel: list users, toggle a role, run ingestion (or check that the 409/lock path behaves), then create, edit and delete an incident and a report.
  - Confirm that a newly created incident shows up in semantic search, which proves the embedding was written.
- **Frontend.**
  - `npm run build` must pass, since it is the only type-check.
  - `npm run dev` on `http://localhost:5173`: sign up, sign out, sign in with email, sign in with Google, edit the username on the account page.
  - While signed out, every existing page still works.
  - `/account` and `/admin` redirect correctly, and a non-admin cannot reach `/admin`.
