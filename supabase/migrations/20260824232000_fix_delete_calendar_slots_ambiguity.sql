create or replace function public.delete_calendar_slots(p_slot_ids uuid[])
returns table(slot_id uuid, action text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_requested_count integer;
  v_valid_count integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_slot_ids is null or cardinality(p_slot_ids) = 0 then
    raise exception 'No slots provided';
  end if;

  select count(distinct requested.requested_slot_id)
  into v_requested_count
  from unnest(p_slot_ids) as requested(requested_slot_id);

  select count(*)
  into v_valid_count
  from public.slots as slot
  join public.businesses as business
    on business.id = slot.business_id
  where slot.id = any(p_slot_ids)
    and business.owner_id = v_user_id
    and slot.status = 'AVAILABLE';

  if v_valid_count <> v_requested_count then
    raise exception
      'Some slots do not exist, are not available or do not belong to the user';
  end if;

  return query
  with slot_classification as (
    select
      slot.id,
      exists (
        select 1
        from public.bookings as booking
        where booking.slot_id = slot.id
      ) as has_history
    from public.slots as slot
    where slot.id = any(p_slot_ids)
      and slot.status = 'AVAILABLE'
  ),
  blocked_slots as (
    update public.slots as slot
    set status = 'BLOCKED'
    from slot_classification as classification
    where slot.id = classification.id
      and classification.has_history = true
    returning slot.id
  ),
  deleted_slots as (
    delete from public.slots as slot
    using slot_classification as classification
    where slot.id = classification.id
      and classification.has_history = false
    returning slot.id
  )
  select blocked_slots.id, 'BLOCKED'::text
  from blocked_slots
  union all
  select deleted_slots.id, 'DELETED'::text
  from deleted_slots;
end;
$$;
