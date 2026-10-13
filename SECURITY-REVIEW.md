# Attendance Validation Security Review

## Scope and verification

This review covers the attendance flow, QR payload validation, and checked-in Supabase SQL. The repository now contains a code-side mitigation and a migration, but neither has been applied to or verified against the live Supabase project. No database connection was used and no secrets were inspected.

## Original finding

The original issue was that `registerAttendance` validated optional QR-supplied start/end values, then directly inserted an attendance row. The checked-in `Students can insert their own attendance` policy constrained `student_id` to `auth.uid()` but did not validate event timing or `scanned_at`, permitting a client-side timing bypass.

## Mitigation in the repository

- `lib/attendance.ts` now parses the QR payload and sends only its event code to `register_attendance`. Registration no longer trusts QR time fields or accepts a student ID argument.
- `app/(tabs)/scan.tsx` keeps the existing login gate and scan feedback, and calls the updated function without passing an identity.
- `supabase/migrations/20261013193300_register_attendance_rpc.sql` adds `public.register_attendance(text)` as a `SECURITY DEFINER` function with `search_path = ''`. It derives the student from `auth.uid()`, locks and reads the canonical event row, rejects missing or invalid time bounds, rejects scans before start or after end using one server timestamp, and supplies that timestamp to the attendance insert.
- The RPC catches unique violations and returns the existing duplicate-attendance message; the `(student_id, event_id)` database unique constraint remains required and is checked as a migration precondition.
- The migration revokes table- and column-level `INSERT` from `PUBLIC`, `anon`, and `authenticated`, removes the checked-in student insert policy, and grants RPC execution only to `authenticated`. Its postcondition checks effective table- and column-level insert privileges for `anon`, `authenticated`, and every role reachable through their role-membership graph (conservatively including `NOINHERIT` memberships that may permit `SET ROLE`); it aborts if any such role retains effective insert privilege.
- Migration preconditions include the expected tables, column types, unique constraints, Supabase roles/auth function, function-name availability, attendance RLS posture, and ownership of both `public.attendance` and `public.events` by the function owner. Event table ownership and non-forced RLS are required so the definer can read and lock the canonical event row.

## Existing protections and limitations

- The unique attendance constraint prevents duplicate rows even across concurrent registration attempts, if present in the target database.
- The checked-in event schema has no separate closed/status field. The RPC therefore enforces the stored time window, not an independent event-closure state.
- The checked-in SQL under `supabase/schema.sql` is a setup script, not evidence of the deployed database state. No earlier migration history or live database configuration was available for comparison. No migration runner is configured in this repository: `package.json` contains only Expo scripts, and no Supabase CLI configuration or alternate migration tool was found.

## Deployment verification required

The migration has not been applied, tested against Supabase, or verified against the deployed schema. Its preconditions intentionally fail rather than continue if the target differs in the required columns/types, uniqueness constraints, RLS posture, roles, function name, or table ownership. The postcondition checks table and column privileges for roles reachable from `anon` and `authenticated` through role memberships; live role memberships and effective grants must still be reviewed.

No migration runner is configured in this repository, so there is no project-local runner version or configuration whose behavior can be confirmed. The recommended deployment path is the official Supabase CLI migration workflow (`supabase db push`) after the project is deliberately linked and migration history is reconciled. Supabase's current CLI documentation prescribes `db push` for deploying migrations, and the CLI upstream integration test asserts `BEGIN` and `COMMIT` around an applied migration ([CLI reference](https://supabase.com/docs/reference/cli/supabase-db-push), [migration guide](https://supabase.com/docs/guides/deployment/database-migrations), [CLI integration test](https://github.com/supabase/cli/blob/main/apps/cli/src/commands/db/push/push.integration.test.ts)). That is evidence for the current upstream CLI, not proof of behavior for an unspecified installed version or configuration. Pin/record the CLI version used for rollout and confirm its transaction behavior in a safe environment, including rollback after a controlled migration failure.

Do not add `BEGIN`/`COMMIT` to this migration unless the selected runner explicitly requires it: a runner such as the current Supabase CLI already wraps a migration in a transaction, and embedded transaction control can conflict with that wrapper. Do not run the statements individually or with autocommit; an interrupted partial application could leave objects or ACL changes inconsistent. Before deployment, review the live schema, ownership, RLS, role memberships, and effective grants. After applying through the approved atomic workflow, verify successful, early, expired, missing-bound, duplicate, unauthenticated, and direct-insert attempts. Until then, do not consider the production bypass closed.
