do $preconditions$
declare
  v_attendance_oid oid := pg_catalog.to_regclass('public.attendance');
  v_events_oid oid := pg_catalog.to_regclass('public.events');
  v_profiles_oid oid := pg_catalog.to_regclass('public.profiles');
  v_attendance_owner oid;
  v_events_owner oid;
  v_attendance_rls boolean;
  v_attendance_force_rls boolean;
  v_events_force_rls boolean;
begin
  if v_attendance_oid is null or v_events_oid is null or v_profiles_oid is null then
    raise exception 'Attendance migration precondition failed: public.profiles, public.attendance, and public.events must exist.';
  end if;

  if pg_catalog.to_regprocedure('auth.uid()') is null then
    raise exception 'Attendance migration precondition failed: auth.uid() is unavailable.';
  end if;

  if pg_catalog.to_regprocedure('public.register_attendance(text)') is not null then
    raise exception 'Attendance migration precondition failed: public.register_attendance(text) already exists.';
  end if;

  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'anon')
     or not exists (select 1 from pg_catalog.pg_roles where rolname = 'authenticated') then
    raise exception 'Attendance migration precondition failed: Supabase anon and authenticated roles must exist.';
  end if;

  if exists (
    select required.column_name
    from (values
      ('student_id', 'uuid'), ('event_id', 'uuid'), ('scanned_at', 'timestamp with time zone')
    ) as required(column_name, data_type)
    where not exists (
      select 1
      from pg_catalog.pg_attribute as a
      where a.attrelid = v_attendance_oid
        and a.attname = required.column_name
        and a.attnum > 0
        and not a.attisdropped
        and pg_catalog.format_type(a.atttypid, a.atttypmod) = required.data_type
    )
  ) or exists (
    select required.column_name
    from (values
      ('id', 'uuid'),
      ('event_code', 'text'),
      ('title', 'text'),
      ('start_time', 'timestamp with time zone'),
      ('end_time', 'timestamp with time zone'),
      ('status', 'text')
    ) as required(column_name, data_type)
    where not exists (
      select 1
      from pg_catalog.pg_attribute as a
      where a.attrelid = v_events_oid
        and a.attname = required.column_name
        and a.attnum > 0
        and not a.attisdropped
        and pg_catalog.format_type(a.atttypid, a.atttypmod) = required.data_type
    )
  ) then
    raise exception 'Attendance migration precondition failed: required attendance/event columns are missing.';
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
    raise exception 'Attendance migration precondition failed: public.profiles.role must be text.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint as c
    where c.conrelid = v_attendance_oid
      and c.contype = 'u'
      and (
        select pg_catalog.array_agg(a.attname order by key_column.ordinality)
        from pg_catalog.unnest(c.conkey) with ordinality as key_column(attnum, ordinality)
        join pg_catalog.pg_attribute as a
          on a.attrelid = c.conrelid
         and a.attnum = key_column.attnum
      ) = array['student_id', 'event_id']::name[]
  ) then
    raise exception 'Attendance migration precondition failed: unique (student_id, event_id) constraint is required.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint as c
    where c.conrelid = v_events_oid
      and c.contype = 'u'
      and (
        select pg_catalog.array_agg(a.attname order by key_column.ordinality)
        from pg_catalog.unnest(c.conkey) with ordinality as key_column(attnum, ordinality)
        join pg_catalog.pg_attribute as a
          on a.attrelid = c.conrelid
         and a.attnum = key_column.attnum
      ) = array['event_code']::name[]
  ) then
    raise exception 'Attendance migration precondition failed: unique events.event_code constraint is required.';
  end if;

  select c.relowner, c.relrowsecurity, c.relforcerowsecurity
    into v_attendance_owner, v_attendance_rls, v_attendance_force_rls
  from pg_catalog.pg_class as c
  where c.oid = v_attendance_oid;

  select c.relowner, c.relforcerowsecurity
    into v_events_owner, v_events_force_rls
  from pg_catalog.pg_class as c
  where c.oid = v_events_oid;

  if v_attendance_owner <> (select r.oid from pg_catalog.pg_roles as r where r.rolname = current_user) then
    raise exception 'Attendance migration precondition failed: run as the owner of public.attendance so the RPC can safely insert.';
  end if;

  if v_events_owner <> (select r.oid from pg_catalog.pg_roles as r where r.rolname = current_user)
     or v_events_force_rls then
    raise exception 'Attendance migration precondition failed: the RPC owner must own public.events and event RLS must not be forced so event lookup and row locking work reliably.';
  end if;

  if not v_attendance_rls or v_attendance_force_rls then
    raise exception 'Attendance migration precondition failed: attendance RLS must be enabled and not forced.';
  end if;
end;
$preconditions$;

create function public.register_attendance(p_event_code text)
returns table (
  success boolean,
  message text,
  event_title text,
  scanned_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_student_id uuid := auth.uid();
  v_profile_role text;
  v_event public.events%rowtype;
  v_scanned_at timestamptz;
begin
  if v_student_id is null then
    return query
      select false, 'Please log in before recording attendance.'::text, null::text, null::timestamptz;
    return;
  end if;

  select p.role
    into v_profile_role
  from public.profiles as p
  where p.id = v_student_id;

  if v_profile_role is distinct from 'student' then
    return query
      select false, 'Only student accounts can record attendance.'::text, null::text, null::timestamptz;
    return;
  end if;

  select e.*
    into v_event
  from public.events as e
  where e.event_code = p_event_code
  for share;

  if not found then
    return query
      select false, 'Event not found. Please ask your teacher to check the QR code.'::text, null::text, null::timestamptz;
    return;
  end if;

  if v_event.status = 'closed' then
    return query
      select false, 'This event is closed and is no longer accepting attendance.'::text, v_event.title, null::timestamptz;
    return;
  end if;

  if v_event.start_time is null or v_event.end_time is null then
    return query
      select false, 'This event does not have a complete attendance schedule.'::text, v_event.title, null::timestamptz;
    return;
  end if;

  if v_event.start_time > v_event.end_time then
    return query
      select false, 'This event has an invalid attendance schedule.'::text, v_event.title, null::timestamptz;
    return;
  end if;

  v_scanned_at := pg_catalog.clock_timestamp();

  if v_scanned_at < v_event.start_time then
    return query
      select false, 'Event has not started yet.'::text, v_event.title, null::timestamptz;
    return;
  end if;

  if v_scanned_at > v_event.end_time then
    return query
      select false, 'Event has already ended.'::text, v_event.title, null::timestamptz;
    return;
  end if;

  begin
    insert into public.attendance (student_id, event_id, scanned_at)
    values (v_student_id, v_event.id, v_scanned_at);
  exception
    when unique_violation then
      return query
        select false, 'Already registered for this event.'::text, v_event.title, null::timestamptz;
      return;
  end;

  return query
    select true, 'Attendance recorded!'::text, v_event.title, v_scanned_at;
end;
$function$;

revoke all on function public.register_attendance(text) from public, anon, authenticated;
grant execute on function public.register_attendance(text) to authenticated;

revoke insert on table public.attendance from public, anon, authenticated;
do $revoke_column_insert$
declare
  v_column_name name;
begin
  for v_column_name in
    select a.attname
    from pg_catalog.pg_attribute as a
    where a.attrelid = pg_catalog.to_regclass('public.attendance')
      and a.attnum > 0
      and not a.attisdropped
  loop
    execute pg_catalog.format(
      'revoke insert (%I) on table public.attendance from public, anon, authenticated',
      v_column_name
    );
  end loop;
end;
$revoke_column_insert$;
do $postconditions$
begin
  if exists (
    with recursive reachable_roles(role_oid) as (
      select r.oid
      from pg_catalog.pg_roles as r
      where r.rolname in ('anon', 'authenticated')
      union
      select membership.roleid
      from pg_catalog.pg_auth_members as membership
      join reachable_roles as reachable
        on membership.member = reachable.role_oid
    )
    select 1
    from reachable_roles as reachable
    join pg_catalog.pg_roles as grantee_role
      on grantee_role.oid = reachable.role_oid
    where pg_catalog.has_table_privilege(
            grantee_role.rolname,
            'public.attendance',
            'INSERT'
          )
       or exists (
            select 1
            from pg_catalog.pg_attribute as a
            where a.attrelid = pg_catalog.to_regclass('public.attendance')
              and a.attnum > 0
              and not a.attisdropped
              and pg_catalog.has_column_privilege(
                    grantee_role.rolname,
                    'public.attendance',
                    a.attname,
                    'INSERT'
                  )
          )
  ) then
    raise exception 'Attendance migration postcondition failed: anon/authenticated or a role reachable through role membership retains effective attendance INSERT privileges.';
  end if;
end;
$postconditions$;
