# QRPass Attendance

Expo / React Native attendance app using Supabase Auth and Postgres. Student, teacher, and administrator accounts use the role stored in `profiles.role`.

## Run locally

1. Install the dependencies with `npm install`.
2. Create a local `.env` file with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Do not commit the file or paste credentials into issues or chat.
3. Run `npx tsc --noEmit` to check types.
4. Run `npx expo start` and open the QR code in Expo Go on the same network.

The app requires Expo Go compatible with the Expo SDK version in `package.json`. Use the Expo CLI prompts for Android or iOS troubleshooting; do not recreate this project from a template.
On native platforms, auth sessions are stored in SecureStore using bounded-size chunks to stay below per-item storage limits.

## Existing Supabase project and migrations

The existing project already contains `profiles`, `events`, and `attendance` data. The former initial-schema script did not match the remote foreign key and dropped/recreated named policies, so it is preserved only as a no-op migration baseline. `supabase/schema.sql` is intentionally non-executable; the old bootstrap is archived under `supabase/legacy/` for reference only.

The active migrations after the baseline are additive:

- `20261013190000_event_metadata.sql` adds event venue, description, open/closed status, and attendance status without recreating tables or dropping policies.
- `20261013193300_register_attendance_rpc.sql` installs the student-only attendance RPC, checks event status and schedule, and removes direct attendance insert privileges while preserving the existing RLS policies.
- `20261013200000_signup_profile_name.sql` updates the existing new-user trigger to save the submitted full name for accounts that require email confirmation.

Do not apply the archived SQL. Before deploying the active migrations, review the remote schema and RLS policies in the Supabase Dashboard, confirm the migration preconditions, and make a database backup. Then inspect `npx supabase db push --dry-run`; do not run `db push` until the plan is reviewed and approved. The migrations have not been applied to the remote project from this workspace.

## Demonstration: event-driven interactions

| Event | Handler | Action | Result |
|---|---|---|---|
| Teacher submits a new event | `handleCreateEvent` | Validates input, inserts the event, and builds a QR payload | The event appears in the teacher list with a QR code |
| Student scans a valid QR code | `handleBarcodeScanned` | Calls `register_attendance(p_event_code)` | The RPC records a present attendance row and the app confirms success |
| Student scans malformed QR data | `handleBarcodeScanned` | `parseQRPayload` rejects it before the RPC call | The app shows an invalid-code message and stores no attendance |
| Student scans an already-used event QR | `handleBarcodeScanned` | The RPC insert reaches the unique `(student_id, event_id)` constraint | The app reports duplicate attendance |
| Student scans before/after the event schedule | `handleBarcodeScanned` | The RPC compares the database time with the event schedule | The app reports that the event has not started or has ended |
| Administrator closes an event | `confirmClose` | Updates `events.status` to `closed` without deleting the event | The event remains in history and later attendance scans are rejected |
| User signs out | Profile screen sign-out handler | Calls Supabase Auth `signOut` | The auth listener clears the session and the app returns to login |

## Assignment scope and operational notes

- Event start and end timestamps provide the event date and schedule; venue and description are optional.
- Only students can record attendance. Teachers and administrators can create events; administrators can close events.
- Database authorization still depends on the remote RLS policies. Review existing profile, event, and attendance policies before deployment; do not replace policies as part of this migration.
- The app can only be fully verified against the remote project after an administrator reviews and applies the migrations. This repository does not deploy database changes automatically.
