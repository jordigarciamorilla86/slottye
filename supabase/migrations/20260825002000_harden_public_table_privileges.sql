-- RLS remains the row-level authority, but the API roles should not retain
-- broad structural privileges inherited from the original schema dump.

do $$
declare
  table_record record;
begin
  for table_record in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'revoke insert, update, delete, truncate, references, trigger on table %I.%I from anon',
      table_record.schemaname,
      table_record.tablename
    );

    execute format(
      'revoke truncate, references, trigger on table %I.%I from authenticated',
      table_record.schemaname,
      table_record.tablename
    );
  end loop;
end;
$$;

-- These are the only direct browser writes currently used by the application.
-- Their RLS policies continue to decide which rows each user may modify.
grant insert, delete on table public.favorites to authenticated;
grant insert, update, delete on table public.business_subscriptions to authenticated;
grant insert on table public.reviews to authenticated;
