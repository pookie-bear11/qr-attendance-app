do $preconditions$
begin
  if pg_catalog.to_regclass('public.profiles') is null
     or pg_catalog.to_regprocedure('public.handle_new_user()') is null then
    raise exception 'Signup profile migration precondition failed: public.profiles and public.handle_new_user() must exist.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_attribute as a
    where a.attrelid = pg_catalog.to_regclass('public.profiles')
      and a.attname = 'full_name'
      and a.atttypid = 'text'::regtype
      and a.attnum > 0
      and not a.attisdropped
  ) then
    raise exception 'Signup profile migration precondition failed: public.profiles.full_name must be text.';
  end if;
end;
$preconditions$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'full_name'), '')
  );
  return new;
end;
$function$;
