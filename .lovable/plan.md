# Scholaris Production-Readiness Audit — Phased Plan

Scope: harden what exists. No new features, no visual redesign, and **zero** AI work — the existing ChatBot, `/api/chat`, `/api/n8n-chat`, `/api/n8n-fetch`, `src/lib/ai-gateway.ts` and the AI SDK dependencies are reported as out-of-scope scaffolding and left byte-identical.

## What the audit already confirmed

- **Route coverage matches the matrix.** All seven role shells exist with their child routes; Messages/Notifications are shared top-level routes (`/messages`, `/notifications`) linked from each role's nav, not per-role duplicates. No missing route file was found.
- **Two Wave 3 placeholders remain:** `/admin/parents` and `/admin/users` render only an `EmptyState` titled "Coming in Wave 3", while the DB already has `parents`, `parent_students`, `user_roles`, and `src/lib/admin-users.functions.ts` server functions.
- **Guards are client-effect-only.** `RoleShell` checks `user`/`role`/`status` inside a `useEffect` and calls `navigate`, so protected content can render for a frame before redirect. There is no `_authenticated` layout; every role route is a top-level SSR route.
- **RLS is uniformly permissive.** Nearly every table carries one policy: `FOR ALL TO authenticated USING/WITH CHECK (school_id = current_school_id() OR has_role(auth.uid(),'super_admin'))`. Confirmed by querying `pg_policies`. Only `audit_logs`, `messages`, `notifications`, `profiles`, `user_roles`, `schools`, `subscriptions` differ.
- **Public seeding endpoint is live.** `src/routes/api/public/seed-demo.ts` accepts unauthenticated POST and uses `supabaseAdmin` (service role) to create auth users, grant roles, and write schools.
- **Data fetching is ad-hoc.** ~42 route files fetch via `useEffect` + `useState` with the browser client; only 16 use `useQuery`; exactly one route defines an `errorComponent`.

## Phase 1 — Critical security (do first)

1. **Neutralize `/api/public/seed-demo`.** Preferred: delete the route and move seeding into a SQL migration / one-off admin-only server function. If demo seeding must stay callable, gate it behind a `SEED_SECRET` header compared with `timingSafeEqual`, plus a hard "already seeded" short-circuit, and keep it out of `api/public/`.
2. **Replace the blanket `FOR ALL` policies with role-aware policies.** Split each table into explicit `SELECT` vs write policies:
   - Admin-owned config (`classes`, `sections`, `subjects`, `academic_sessions`, `timetable`, `teacher_assignments`, `students`, `teachers`, `parents`, `parent_students`, `announcements`, `books` and library master tables, `vehicles`, `drivers`, `transport_routes`, `route_stops`, `student_transport`): writes require `school_admin` (plus `transport` for transport tables, `accountant` for fee tables).
   - Fees (`fee_structures`, `fee_invoices`, `fee_payments`, `fee_discounts`, `fee_fines`): write = `school_admin` or `accountant`; students/parents get read scoped to their own student rows.
   - Teaching data (`attendance`, `exams`, `exam_results`, `homework`, `homework_submissions`): write = `school_admin` or `teacher`; `homework_submissions` writable by the owning student; students/parents read own rows only.
   - Students/parents lose blanket school-wide reads of `students`, `teachers`, `fee_*`, `attendance` — add self/child-scoped SELECT policies backed by small `security definer` helpers (`is_my_student(uuid)`).
3. **Re-verify grants** on every table touched, and re-run the database linter after the migration.
4. **Audit `SECURITY DEFINER` RPCs** (`mark_attendance_bulk`, `generate_invoices_for_structure`, `issue_book`, `return_book`, `set_exam_published`, `create_notification`, `delete_*_if_unreferenced`, `set_current_session`) — each currently checks school scope only; add role checks so a student cannot invoke them.

## Phase 2 — Route guarding and reachability

- Introduce a real gate: move role subtrees under a pathless `_authenticated` layout (`ssr: false`, redirect to `/login`) and keep `RoleShell` for chrome + role mismatch, so no protected markup renders pre-redirect.
- Verify every nav target resolves, every `Link`/`navigate` target exists, and role mismatch lands on `/access-denied` rather than a flash of the wrong dashboard.
- Confirm `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/no-role`, `/access-denied` stay public with correct redirects for already-signed-in users.
- Add per-route `head()` metadata where missing (unique title/description) for the public routes.

## Phase 3 — Data layer consistency

- Standardize reads on TanStack Query (`queryOptions` + `useQuery`/`useSuspenseQuery`) with shared query keys, replacing `useEffect` + `setState` loaders, so mutations invalidate instead of manual `load()` calls.
- Ensure every mutation: validates input, surfaces Supabase errors via `toast`, disables the submit control while pending, and invalidates the right keys.
- Remove reliance on the loose Supabase typing shims (`client-loose` / `server-loose` + `tsconfig` path overrides) now that the schema is real, so table/column typos fail the typecheck again.
- Re-check known column-drift spots (`fee_payments.amount` vs `amount_paid`, `book_loans` borrower fields, `notifications.kind`) and pick one canonical field per concept in the UI.

## Phase 4 — States, forms, responsiveness

- Every route with a loader gets `errorComponent` + `notFoundComponent`; every list gets skeleton (`TableSkeleton`/`DashboardSkeleton`), `EmptyState`, and `ErrorState` with retry.
- Forms: required-field validation, numeric/date bounds, duplicate-name handling, confirm dialogs on destructive actions (reuse `ConfirmDialog`).
- Responsive pass at 360/768/1280: sidebar sheet behavior, table horizontal scroll wrappers, timetable and attendance grids, dialog height on mobile.

## Phase 5 — Wave 3 completion

- `/admin/parents`: list, create, edit, archive parents; link/unlink children via `parent_students`.
- `/admin/users`: list school users with roles from `user_roles`, invite/create user, assign or revoke role, suspend/reactivate — through admin server functions with role checks, never client-side role writes.

## Phase 6 — Verification

- Typecheck + `bun run lint` + production build clean.
- Database linter clean or every remaining finding explained.
- Browser-driven smoke run per role (sign in, load every nav item, perform one create/update, sign out) with console/network error capture.
- Negative security checks: signed-in student attempting writes to `classes`, `fee_invoices`, `exam_results` must be rejected by RLS; unauthenticated POST to the old seed path must not create anything.

## Technical notes

- All schema/policy work goes through migrations (create → grant → enable RLS → policies), one migration per phase-1 concern so a failure is easy to isolate.
- Role checks stay server-side (`has_role`, RLS, server functions). `src/lib/permissions.ts` remains a UI-affordance helper only.
- No dependency additions; no changes under `src/integrations/supabase/*` generated files.
