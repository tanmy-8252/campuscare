-- CampusCare's tables are private. Only the explicitly granted functions are
-- callable by app users; every function derives identity from auth.uid().
create table public.cc_organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  kind text not null check (kind in ('College','Workplace')),
  location text not null check (char_length(location) between 2 and 160),
  join_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''),1,20)),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index cc_organisation_name on public.cc_organisations (lower(name));

create table public.cc_memberships (
  user_id uuid primary key references auth.users(id),
  organisation_id uuid not null references public.cc_organisations(id),
  role text not null check (role in ('admin','resident','worker')),
  status text not null check (status in ('active','pending','rejected')),
  name text not null,
  specialty text check (specialty in ('Electrical','Plumbing','Sanitation','Infrastructure','Other')),
  created_at timestamptz not null default now()
);
create index cc_membership_organisation on public.cc_memberships (organisation_id);

create table public.cc_workspaces (
  organisation_id uuid primary key references public.cc_organisations(id),
  data jsonb not null default '{"issues":[],"workers":[]}'::jsonb,
  next_number integer not null default 1000
);

alter table public.cc_organisations enable row level security;
alter table public.cc_memberships enable row level security;
alter table public.cc_workspaces enable row level security;
revoke all on public.cc_organisations, public.cc_memberships, public.cc_workspaces from anon, authenticated;

create function public.cc_directory() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'kind',kind,'location',location) order by name),'[]'::jsonb)
  from public.cc_organisations;
$$;

create function public.cc_context() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to continue.' using errcode='28000'; end if;
  select jsonb_build_object('userId',m.user_id,'name',m.name,'role',m.role,'status',m.status,
    'organisation',jsonb_build_object('id',o.id,'name',o.name,'kind',o.kind,'location',o.location))
    into result from public.cc_memberships m join public.cc_organisations o on o.id=m.organisation_id
    where m.user_id=auth.uid();
  return result;
end $$;

create function public.cc_create_organisation(p_name text,p_kind text,p_location text) returns jsonb
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
  raise exception 'That organisation is already registered. Join it using its organisation code.' using errcode='P0001';
end $$;

create function public.cc_join_organisation(p_organisation uuid,p_code text,p_role text,p_specialty text default null) returns jsonb
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
  if not exists(select 1 from public.cc_organisations where id=p_organisation and join_code=upper(trim(p_code))) then
    raise exception 'The organisation code does not match. Ask your administrator for the code.' using errcode='42501';
  end if;
  select coalesce(nullif(left(raw_user_meta_data->>'name',80),''),email,'Campus member') into v_name from auth.users where id=auth.uid();
  insert into public.cc_memberships(user_id,organisation_id,role,status,name,specialty)
    values(auth.uid(),p_organisation,p_role,case when p_role='worker' then 'pending' else 'active' end,v_name,case when p_role='worker' then p_specialty else null end);
  return public.cc_context();
end $$;

create function public.cc_members() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m public.cc_memberships; result jsonb;
begin
  select * into m from public.cc_memberships where user_id=auth.uid() and status='active' and role='admin';
  if not found then raise exception 'Administrator access is required.' using errcode='42501'; end if;
  select jsonb_build_object('joinCode',o.join_code,'members',
    coalesce((select jsonb_agg(jsonb_build_object('userId',x.user_id,'name',x.name,'role',x.role,'status',x.status,'specialty',x.specialty) order by x.created_at)
      from public.cc_memberships x where x.organisation_id=o.id),'[]'::jsonb))
    into result from public.cc_organisations o where o.id=m.organisation_id;
  return result;
end $$;

create function public.cc_review_worker(p_user uuid,p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.cc_memberships; w public.cc_memberships;
begin
  select * into m from public.cc_memberships where user_id=auth.uid() and status='active' and role='admin';
  if not found then raise exception 'Administrator access is required.' using errcode='42501'; end if;
  select * into w from public.cc_memberships where user_id=p_user and organisation_id=m.organisation_id and role='worker' for update;
  if not found then raise exception 'Worker request not found in your organisation.' using errcode='42501'; end if;
  if w.status <> 'pending' then raise exception 'This request has already been reviewed.' using errcode='P0001'; end if;
  if p_approve is null then raise exception 'Choose approve or reject.' using errcode='22023'; end if;
  update public.cc_memberships set status=case when p_approve then 'active' else 'rejected' end where user_id=w.user_id;
  if p_approve then
    update public.cc_workspaces set data=jsonb_set(data,'{workers}',(data->'workers') || jsonb_build_array(jsonb_build_object('id',w.user_id,'name',w.name,'specialty',w.specialty,'phone','')))
      where organisation_id=m.organisation_id;
  end if;
end $$;

create function public.cc_workspace() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m public.cc_memberships; d jsonb;
begin
  select * into m from public.cc_memberships where user_id=auth.uid() and status='active';
  if not found then raise exception 'Active organisation membership is required.' using errcode='42501'; end if;
  select data into d from public.cc_workspaces where organisation_id=m.organisation_id;
  if m.role='worker' then
    d:=jsonb_set(d,'{issues}',coalesce((select jsonb_agg(i) from jsonb_array_elements(d->'issues') i where i->>'workerId'=m.user_id::text),'[]'::jsonb));
  end if;
  return d;
end $$;

create function public.cc_apply_action(p_action jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.cc_memberships; w public.cc_memberships; d jsonb; item jsonb; updated jsonb; a text;
  v_id text; v_number integer; v_index integer; message text; at_text text:=to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  select * into m from public.cc_memberships where user_id=auth.uid() and status='active';
  if not found then raise exception 'Active organisation membership is required.' using errcode='42501'; end if;
  a:=p_action->>'action';
  if a is null or a not in ('create','assign','start','resolve','confirm','reopen','support') then
    raise exception 'Unsupported action.' using errcode='22023';
  end if;
  if (a='assign' and m.role<>'admin') or (a in ('start','resolve') and m.role<>'worker') or
     (a in ('create','support') and m.role='worker') then
    raise exception 'Your role cannot perform this action.' using errcode='42501';
  end if;
  if a in ('create','assign') and coalesce(p_action->>'priority','') not in ('Low','Medium','High') then
    raise exception 'Choose a valid priority.' using errcode='22023';
  end if;
  if a in ('resolve','reopen') and coalesce(char_length(trim(p_action->>'note')),0) not between 1 and 2000 then
    raise exception 'Enter a valid repair or reopen note.' using errcode='22023';
  end if;
  if p_action->>'photo' is not null and (
    char_length(p_action->>'photo')>1000 or
    (p_action->>'photo') !~ '^https://res[.]cloudinary[.]com/[a-zA-Z0-9_-]+/image/upload/' or
    strpos(p_action->>'photo','/campuscare/'||m.organisation_id::text||'/'||m.user_id::text||'/')=0
  ) then raise exception 'Upload the photo through your organisation first.' using errcode='22023'; end if;
  select data,next_number into d,v_number from public.cc_workspaces where organisation_id=m.organisation_id for update;
  if a='create' then
    if coalesce(char_length(trim(p_action->>'title')),0) not between 1 and 120 or
       coalesce(char_length(trim(p_action->>'description')),0) not between 1 and 2000 or
       coalesce(char_length(trim(p_action->>'location')),0) not between 1 and 160 or
       coalesce(p_action->>'category','') not in ('Electrical','Plumbing','Sanitation','Infrastructure','Other') or
       coalesce(p_action->>'zone','') not in ('Academic Block','Hostel Zone','Library','Sports Complex','Main Gate','Cafeteria') then
      raise exception 'Check the required report fields.' using errcode='22023';
    end if;
    v_number:=v_number+1;
    item:=jsonb_build_object('id','CC-'||v_number,'title',trim(p_action->>'title'),'category',p_action->>'category',
      'zone',p_action->>'zone','location',trim(p_action->>'location'),'description',trim(p_action->>'description'),
      'priority',p_action->>'priority','status','Reported','reporter',m.name,'reporterId',m.user_id,'workerId',null,
      'photo',p_action->>'photo','completionPhoto',null,'note','','createdAt',at_text,'updatedAt',at_text,
      'supporters','[]'::jsonb,'history',jsonb_build_array(jsonb_build_object('text','Issue reported','at',at_text)));
    d:=jsonb_set(d,'{issues}',jsonb_build_array(item)||(d->'issues'));
  else
    select i.value,(i.ordinality-1)::integer into item,v_index from jsonb_array_elements(d->'issues') with ordinality i where i.value->>'id'=p_action->>'id';
    if item is null then raise exception 'Issue not found in your organisation.' using errcode='42501'; end if;
    if a='assign' then
      select * into w from public.cc_memberships where user_id::text=p_action->>'workerId' and organisation_id=m.organisation_id and role='worker' and status='active';
      if not found then raise exception 'Choose an approved worker in your organisation.' using errcode='42501'; end if;
      if w.specialty<>item->>'category' and w.specialty<>'Other' then raise exception 'Choose a worker with the matching specialty.' using errcode='22023'; end if;
      if item->>'status' in ('Resolved','Confirmed') then raise exception 'Reopen the issue before assigning it.' using errcode='P0001'; end if;
      item:=item||jsonb_build_object('workerId',w.user_id,'priority',p_action->>'priority','status','Assigned');
      message:='Assigned to '||w.name;
    elsif a in ('start','resolve') then
      if item->>'workerId'<>m.user_id::text or item->>'workerId' is null or
         (p_action ? 'workerId' and p_action->>'workerId' is distinct from m.user_id::text) then
        raise exception 'This job is not assigned to your account.' using errcode='42501';
      end if;
      if a='start' then
        if item->>'status'<>'Assigned' then raise exception 'Only assigned jobs can be started.' using errcode='P0001'; end if;
        item:=item||jsonb_build_object('status','In progress');message:='Work started';
      else
        if item->>'status'<>'In progress' then raise exception 'Start the job before completing it.' using errcode='P0001'; end if;
        item:=item||jsonb_build_object('status','Resolved','note',trim(p_action->>'note'),'completionPhoto',p_action->>'photo');
        message:='Repair completed: '||trim(p_action->>'note');
      end if;
    elsif a in ('confirm','reopen') then
      if item->>'reporterId' is distinct from m.user_id::text then raise exception 'Only the reporter can confirm or reopen this issue.' using errcode='42501'; end if;
      if (a='confirm' and item->>'status'<>'Resolved') or (a='reopen' and item->>'status' not in ('Resolved','Confirmed')) then
        raise exception 'The report is not ready for this action.' using errcode='P0001';
      end if;
      if a='confirm' then item:=item||'{"status":"Confirmed"}'::jsonb;message:='Reporter confirmed the repair';
      else item:=item||'{"status":"Reported","workerId":null}'::jsonb;message:='Reporter reopened the issue: '||trim(p_action->>'note'); end if;
    elsif a='support' then
      if item->>'reporterId'=m.user_id::text then raise exception 'You already reported this issue.' using errcode='22023'; end if;
      if item->>'status' in ('Resolved','Confirmed') then raise exception 'This issue has already been completed.' using errcode='P0001'; end if;
      if (item->'supporters') ? m.user_id::text then raise exception 'You already supported this report.' using errcode='P0001'; end if;
      item:=jsonb_set(item,'{supporters}',(item->'supporters')||jsonb_build_array(m.user_id));message:='Another campus member is affected';
    end if;
    item:=item||jsonb_build_object('updatedAt',at_text,'history',(item->'history')||jsonb_build_array(jsonb_build_object('text',message,'at',at_text)));
    updated:=jsonb_set(d,array['issues',v_index::text],item);d:=updated;
  end if;
  update public.cc_workspaces set data=d,next_number=v_number where organisation_id=m.organisation_id;
end $$;

revoke all on function public.cc_directory(), public.cc_context(), public.cc_create_organisation(text,text,text),
  public.cc_join_organisation(uuid,text,text,text), public.cc_members(), public.cc_review_worker(uuid,boolean),
  public.cc_workspace(), public.cc_apply_action(jsonb) from public,anon,authenticated;
grant execute on function public.cc_directory() to anon,authenticated;
grant execute on function public.cc_context(), public.cc_create_organisation(text,text,text), public.cc_join_organisation(uuid,text,text,text),
  public.cc_members(), public.cc_review_worker(uuid,boolean), public.cc_workspace(), public.cc_apply_action(jsonb) to authenticated;
