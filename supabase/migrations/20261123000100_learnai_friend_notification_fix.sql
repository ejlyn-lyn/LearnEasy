create or replace function public.notify_friend_request()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_name text;
begin
  if new.status = 'pending' then
    select display_name into v_name
    from public.profiles
    where id = new.requester_id;

    insert into public.notifications(recipient_id, actor_id, kind, friendship_id, message)
    values (
      new.addressee_id,
      new.requester_id,
      'friend_request',
      new.id,
      coalesce(v_name, 'Jemand') || ' möchte dich als Freund hinzufügen.'
    );
  end if;
  return new;
end;
$$;
