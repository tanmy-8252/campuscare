-- Keep identity, membership, and worker checks in the database.
-- Existing functions keep their signatures so older clients remain compatible.
create or replace function public.cc_join_organisation(p_organisation uuid,p_code text,p_role text,p_specialty text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  if auth.uid() is null then raise exception 'Sign in to continue.' using errcode='28000'; end if;
  if p_role is null or p_role not in ('resident','worker') then
    raise exception 'Admin access is only created with a new organisation.' using errcode='42501';
  end if;
  if p_role='worker' and (p_specialty is null or p_specialty not in ('Electrical','Plumbing','Sanitation','Infrastructure','Other')) then
    raise exception 'Choose your maintenance specialty.' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  if exists(select 1 from public.cc_memberships where user_id=auth.uid()) then
    raise exception 'This account already belongs to an organisation.' using errcode='P0001';
  end if;
  if not exists(select 1 from public.cc_organisations where id=p_organisation) then
    raise exception 'Choose an existing organisation.' using errcode='22023';
  end if;
  -- Students and employees select an organisation; only workers need its code.
  if p_role='worker' and not exists(select 1 from public.cc_organisations where id=p_organisation and join_code=upper(trim(p_code))) then
    raise exception 'The organisation code does not match. Ask your administrator for the code.' using errcode='42501';
  end if;
  select coalesce(nullif(left(raw_user_meta_data->>'name',80),''),email,'Campus member') into v_name from auth.users where id=auth.uid();
  insert into public.cc_memberships(user_id,organisation_id,role,status,name,specialty)
    values(auth.uid(),p_organisation,p_role,case when p_role='worker' then 'pending' else 'active' end,v_name,case when p_role='worker' then p_specialty else null end);
  return public.cc_context();
end $$;

create or replace function public.cc_create_organisation(p_name text,p_kind text,p_location text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_name text;
begin
  if auth.uid() is null then raise exception 'Sign in to continue.' using errcode='28000'; end if;
  if char_length(trim(p_name)) not between 2 and 120 or p_name is null or
     char_length(trim(p_location)) not between 2 and 160 or p_location is null or
     p_kind is null or p_kind not in ('College','Workplace') then
    raise exception 'Enter valid organisation details.' using errcode='22023';
  end if;
  -- Serialise first-time onboarding for this account, including duplicate tabs.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  if exists(select 1 from public.cc_memberships where user_id=auth.uid()) then
    raise exception 'This account already belongs to an organisation.' using errcode='P0001';
  end if;
  select coalesce(nullif(left(raw_user_meta_data->>'name',80),''),email,'Campus member') into v_name from auth.users where id=auth.uid();
  insert into public.cc_organisations(name,kind,location,created_by)
    values(trim(p_name),p_kind,trim(p_location),auth.uid()) returning id into v_id;
  insert into public.cc_memberships(user_id,organisation_id,role,status,name)
    values(auth.uid(),v_id,'admin','active',v_name);
  insert into public.cc_workspaces(organisation_id) values(v_id);
  return public.cc_context();
exception when unique_violation then
  raise exception 'That organisation is already registered. Students and employees can select it to join; workers need its code and admin approval.' using errcode='P0001';
end $$;

revoke all on function public.cc_join_organisation(uuid,text,text,text), public.cc_create_organisation(text,text,text) from public,anon,authenticated;
grant execute on function public.cc_join_organisation(uuid,text,text,text), public.cc_create_organisation(text,text,text) to authenticated;
