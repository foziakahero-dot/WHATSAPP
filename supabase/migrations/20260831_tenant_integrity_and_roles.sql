-- Prevent cross-tenant relationships at the database layer.
-- NOT VALID preserves compatibility with existing installations while still
-- enforcing every new or updated row. Validate after resolving any legacy rows.

create unique index if not exists channels_id_org_key on public.channels (id, organization_id);
create unique index if not exists agents_id_org_key on public.agents (id, organization_id);
create unique index if not exists contacts_id_org_key on public.contacts (id, organization_id);
create unique index if not exists conversations_id_org_key on public.conversations (id, organization_id);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'knowledge_sources_agent_org_fk') then
    alter table public.knowledge_sources add constraint knowledge_sources_agent_org_fk
      foreign key (agent_id, organization_id) references public.agents (id, organization_id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'conversations_channel_org_fk') then
    alter table public.conversations add constraint conversations_channel_org_fk
      foreign key (channel_id, organization_id) references public.channels (id, organization_id) on delete set null (channel_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'conversations_contact_org_fk') then
    alter table public.conversations add constraint conversations_contact_org_fk
      foreign key (contact_id, organization_id) references public.contacts (id, organization_id) on delete set null (contact_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'conversations_agent_org_fk') then
    alter table public.conversations add constraint conversations_agent_org_fk
      foreign key (agent_id, organization_id) references public.agents (id, organization_id) on delete set null (agent_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'messages_conversation_org_fk') then
    alter table public.messages add constraint messages_conversation_org_fk
      foreign key (conversation_id, organization_id) references public.conversations (id, organization_id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'leads_contact_org_fk') then
    alter table public.leads add constraint leads_contact_org_fk
      foreign key (contact_id, organization_id) references public.contacts (id, organization_id) on delete set null (contact_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'leads_conversation_org_fk') then
    alter table public.leads add constraint leads_conversation_org_fk
      foreign key (conversation_id, organization_id) references public.conversations (id, organization_id) on delete set null (conversation_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bookings_contact_org_fk') then
    alter table public.bookings add constraint bookings_contact_org_fk
      foreign key (contact_id, organization_id) references public.contacts (id, organization_id) on delete set null (contact_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bookings_conversation_org_fk') then
    alter table public.bookings add constraint bookings_conversation_org_fk
      foreign key (conversation_id, organization_id) references public.conversations (id, organization_id) on delete set null (conversation_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'actions_conversation_org_fk') then
    alter table public.actions add constraint actions_conversation_org_fk
      foreign key (conversation_id, organization_id) references public.conversations (id, organization_id) on delete set null (conversation_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'actions_agent_org_fk') then
    alter table public.actions add constraint actions_agent_org_fk
      foreign key (agent_id, organization_id) references public.agents (id, organization_id) on delete set null (agent_id) not valid;
  end if;
end $$;

-- Align database roles with the Make admin design while keeping `member`
-- for backwards compatibility.
alter table public.organization_members drop constraint if exists organization_members_role_check;
alter table public.organization_members add constraint organization_members_role_check
  check (role in ('owner','admin','manager','agent','viewer','member'));

create or replace function private.has_org_role(org_id uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = (select auth.uid())
      and om.role = any(allowed_roles)
  );
$$;

revoke all on function private.has_org_role(uuid, text[]) from public, anon;
grant execute on function private.has_org_role(uuid, text[]) to authenticated;
