create or replace function public.create_organization(org_name text, org_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org_id uuid;
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if length(trim(org_name)) < 2 then
    raise exception 'Organization name is too short';
  end if;

  if org_slug !~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$' then
    raise exception 'Invalid organization slug';
  end if;

  insert into public.organizations (name, slug)
  values (trim(org_name), lower(org_slug))
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, current_user_id, 'owner');

  insert into public.agents (
    organization_id,
    name,
    role,
    status,
    instructions,
    permissions
  ) values (
    new_org_id,
    'Maya',
    'receptionist',
    'draft',
    'Help customers, qualify leads, and hand off when information or authority is missing.',
    jsonb_build_object(
      'answer_questions', true,
      'capture_leads', true,
      'book_appointments', false,
      'send_payment_links', false,
      'issue_refunds', false
    )
  );

  return new_org_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public, anon;
grant execute on function public.create_organization(text, text) to authenticated;
