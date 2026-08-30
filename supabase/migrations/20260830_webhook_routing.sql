create unique index if not exists channels_provider_phone_number_unique
  on public.channels (provider, phone_number_id);

create unique index if not exists contacts_org_external_id_unique
  on public.contacts (organization_id, external_id);

create index if not exists channels_org_idx on public.channels (organization_id);
create index if not exists agents_org_idx on public.agents (organization_id);
create index if not exists knowledge_sources_org_idx on public.knowledge_sources (organization_id);
create index if not exists knowledge_sources_agent_idx on public.knowledge_sources (agent_id);
create index if not exists organization_members_user_idx on public.organization_members (user_id);
create index if not exists conversations_channel_idx on public.conversations (channel_id);
create index if not exists conversations_contact_idx on public.conversations (contact_id);
create index if not exists conversations_agent_idx on public.conversations (agent_id);
create index if not exists conversations_assigned_user_idx on public.conversations (assigned_user_id);
create index if not exists leads_contact_idx on public.leads (contact_id);
create index if not exists leads_conversation_idx on public.leads (conversation_id);
create index if not exists bookings_contact_idx on public.bookings (contact_id);
create index if not exists bookings_conversation_idx on public.bookings (conversation_id);
create index if not exists actions_conversation_idx on public.actions (conversation_id);
create index if not exists actions_agent_idx on public.actions (agent_id);
create index if not exists messages_org_idx on public.messages (organization_id);
