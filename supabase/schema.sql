create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'launch',
  timezone text not null default 'UTC',
  default_language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member','agent')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'whatsapp',
  provider_account_id text,
  phone_number_id text,
  display_phone_number text,
  status text not null default 'disconnected' check (status in ('disconnected','pending','active','error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  role text not null default 'receptionist',
  status text not null default 'draft' check (status in ('draft','active','paused')),
  instructions text,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete cascade,
  source_type text not null check (source_type in ('website','document','text','faq')),
  title text,
  source_url text,
  content text,
  status text not null default 'pending' check (status in ('pending','processing','ready','failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  external_id text,
  display_name text,
  phone text,
  email text,
  language text,
  opt_in_status text not null default 'unknown' check (opt_in_status in ('unknown','opted_in','opted_out')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  status text not null default 'open' check (status in ('open','resolved','handoff')),
  assigned_user_id uuid references auth.users(id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  sender_type text not null check (sender_type in ('customer','ai','human','system')),
  body text,
  provider_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  status text not null default 'new' check (status in ('new','qualified','won','lost')),
  score int not null default 0 check (score between 0 and 100),
  value_estimate numeric(12,2),
  currency text not null default 'USD',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'confirmed' check (status in ('pending','confirmed','cancelled','completed')),
  external_event_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  action_type text not null,
  status text not null default 'pending' check (status in ('pending','completed','failed','approval_required')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index contacts_org_idx on public.contacts (organization_id);
create index conversations_org_last_message_idx on public.conversations (organization_id, last_message_at desc);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index leads_org_status_idx on public.leads (organization_id, status);
create index bookings_org_starts_idx on public.bookings (organization_id, starts_at);
create index actions_org_created_idx on public.actions (organization_id, created_at desc);
create unique index messages_provider_message_id_key on public.messages (provider_message_id) where provider_message_id is not null;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.channels enable row level security;
alter table public.agents enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.leads enable row level security;
alter table public.bookings enable row level security;
alter table public.actions enable row level security;

create or replace function private.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_org_admin(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = (select auth.uid())
      and om.role in ('owner','admin')
  );
$$;

revoke all on function private.is_org_member(uuid) from public, anon;
revoke all on function private.is_org_admin(uuid) from public, anon;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.is_org_admin(uuid) to authenticated;

create policy organizations_select on public.organizations
  for select to authenticated
  using (private.is_org_member(id));
create policy organizations_update on public.organizations
  for update to authenticated
  using (private.is_org_admin(id))
  with check (private.is_org_admin(id));

create policy organization_members_select on public.organization_members
  for select to authenticated
  using (private.is_org_member(organization_id));

create policy channels_select on public.channels
  for select to authenticated using (private.is_org_member(organization_id));
create policy channels_insert on public.channels
  for insert to authenticated with check (private.is_org_admin(organization_id));
create policy channels_update on public.channels
  for update to authenticated using (private.is_org_admin(organization_id)) with check (private.is_org_admin(organization_id));
create policy channels_delete on public.channels
  for delete to authenticated using (private.is_org_admin(organization_id));

create policy agents_select on public.agents
  for select to authenticated using (private.is_org_member(organization_id));
create policy agents_insert on public.agents
  for insert to authenticated with check (private.is_org_admin(organization_id));
create policy agents_update on public.agents
  for update to authenticated using (private.is_org_admin(organization_id)) with check (private.is_org_admin(organization_id));
create policy agents_delete on public.agents
  for delete to authenticated using (private.is_org_admin(organization_id));

create policy knowledge_sources_select on public.knowledge_sources
  for select to authenticated using (private.is_org_member(organization_id));
create policy knowledge_sources_insert on public.knowledge_sources
  for insert to authenticated with check (private.is_org_admin(organization_id));
create policy knowledge_sources_update on public.knowledge_sources
  for update to authenticated using (private.is_org_admin(organization_id)) with check (private.is_org_admin(organization_id));
create policy knowledge_sources_delete on public.knowledge_sources
  for delete to authenticated using (private.is_org_admin(organization_id));

create policy contacts_select on public.contacts
  for select to authenticated using (private.is_org_member(organization_id));
create policy contacts_insert on public.contacts
  for insert to authenticated with check (private.is_org_member(organization_id));
create policy contacts_update on public.contacts
  for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy contacts_delete on public.contacts
  for delete to authenticated using (private.is_org_admin(organization_id));

create policy conversations_select on public.conversations
  for select to authenticated using (private.is_org_member(organization_id));
create policy conversations_insert on public.conversations
  for insert to authenticated with check (private.is_org_member(organization_id));
create policy conversations_update on public.conversations
  for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy conversations_delete on public.conversations
  for delete to authenticated using (private.is_org_admin(organization_id));

create policy messages_select on public.messages
  for select to authenticated using (private.is_org_member(organization_id));
create policy messages_insert on public.messages
  for insert to authenticated with check (private.is_org_member(organization_id));
create policy messages_update on public.messages
  for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy messages_delete on public.messages
  for delete to authenticated using (private.is_org_admin(organization_id));

create policy leads_select on public.leads
  for select to authenticated using (private.is_org_member(organization_id));
create policy leads_insert on public.leads
  for insert to authenticated with check (private.is_org_member(organization_id));
create policy leads_update on public.leads
  for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy leads_delete on public.leads
  for delete to authenticated using (private.is_org_admin(organization_id));

create policy bookings_select on public.bookings
  for select to authenticated using (private.is_org_member(organization_id));
create policy bookings_insert on public.bookings
  for insert to authenticated with check (private.is_org_member(organization_id));
create policy bookings_update on public.bookings
  for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy bookings_delete on public.bookings
  for delete to authenticated using (private.is_org_admin(organization_id));

create policy actions_select on public.actions
  for select to authenticated using (private.is_org_member(organization_id));
create policy actions_insert on public.actions
  for insert to authenticated with check (private.is_org_member(organization_id));
create policy actions_update on public.actions
  for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy actions_delete on public.actions
  for delete to authenticated using (private.is_org_admin(organization_id));

grant usage on schema public to authenticated;
grant select, update on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select, insert, update, delete on public.channels to authenticated;
grant select, insert, update, delete on public.agents to authenticated;
grant select, insert, update, delete on public.knowledge_sources to authenticated;
grant select, insert, update, delete on public.contacts to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.bookings to authenticated;
grant select, insert, update, delete on public.actions to authenticated;
