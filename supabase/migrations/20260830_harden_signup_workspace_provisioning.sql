drop function if exists public.create_organization(text, text);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org_id uuid;
  generated_slug text;
begin
  generated_slug := 'workspace-' || replace(left(new.id::text, 12), '-', '');

  insert into public.organizations (name, slug)
  values ('My business', generated_slug)
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, new.id, 'owner');

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

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_convoops on auth.users;
create trigger on_auth_user_created_convoops
after insert on auth.users
for each row execute function private.handle_new_user();
