do $preconditions$
declare
  v_events_oid oid := pg_catalog.to_regclass('public.events');
  v_profiles_oid oid := pg_catalog.to_regclass('public.profiles');
  v_attendance_oid oid := pg_catalog.to_regclass('public.attendance');
begin
  if v_events_oid is null or v_profiles_oid is null or v_attendance_oid is null then
    raise exception 'Metadata migration precondition failed: public.profiles, public.events, and public.attendance must already exist.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_attribute as a
    where a.attrelid = v_events_oid
      and a.attname in ('id', 'event_code', 'title', 'start_time', 'end_time')
      and a.attnum > 0
      and not a.attisdropped
    group by a.attrelid
    having count(*) = 5
  ) then
    raise exception 'Event migration precondition failed: expected event identity and schedule columns are missing.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_attribute as a
    where a.attrelid = v_profiles_oid
      and a.attname = 'role'
      and a.atttypid = 'text'::regtype
      and a.attnum > 0
      and not a.attisdropped
  ) then
    raise exception 'Event migration precondition failed: public.profiles.role must be text.';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_attribute as a
    where a.attrelid = v_events_oid
      and a.attname = 'status'
      and a.atttypid <> 'text'::regtype
      and a.attnum > 0
      and not a.attisdropped
  ) then
    raise exception 'Event migration precondition failed: an existing public.events.status column must be text.';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_attribute as a
    where a.attrelid = v_attendance_oid
      and a.attname = 'status'
      and a.atttypid <> 'text'::regtype
      and a.attnum > 0
      and not a.attisdropped
  ) then
    raise exception 'Metadata migration precondition failed: an existing public.attendance.status column must be text.';
  end if;
end;
$preconditions$;

alter table public.events
  add column if not exists venue text,
  add column if not exists description text,
  add column if not exists status text not null default 'open';

alter table public.attendance
  add column if not exists status text not null default 'present';

do $attendance_status$
begin
  if exists (
    select 1
    from public.attendance
    where status is null
  ) then
    raise exception 'Attendance metadata migration stopped: existing NULL attendance statuses need manual review; no attendance rows were changed.';
  end if;
end;
$attendance_status$;

alter table public.attendance
  alter column status set default 'present',
  alter column status set not null;

do $status_constraint$
begin
  if exists (
    select 1
    from public.events
    where status is null
       or status not in ('open', 'closed')
  ) then
    raise exception 'Event migration stopped: existing event statuses need manual review before limiting them to open/closed.';
  end if;

  alter table public.events
    alter column status set default 'open',
    alter column status set not null;

  if not exists (
    select 1
    from pg_catalog.pg_constraint as c
    where c.conrelid = pg_catalog.to_regclass('public.events')
      and c.conname = 'events_qr_attendance_status_check'
  ) then
    alter table public.events
      add constraint events_qr_attendance_status_check
      check (status in ('open', 'closed'));
  end if;
end;
$status_constraint$;
