-- Cover every composite tenant foreign key and platform audit reference.
-- Besides faster joins, these indexes keep parent deletes and updates from
-- forcing sequential scans as the dataset grows.

create index if not exists knowledge_sources_agent_org_fk_idx
  on public.knowledge_sources (agent_id, organization_id);

create index if not exists conversations_channel_org_fk_idx
  on public.conversations (channel_id, organization_id);
create index if not exists conversations_contact_org_fk_idx
  on public.conversations (contact_id, organization_id);
create index if not exists conversations_agent_org_fk_idx
  on public.conversations (agent_id, organization_id);

create index if not exists messages_conversation_org_fk_idx
  on public.messages (conversation_id, organization_id);

create index if not exists leads_contact_org_fk_idx
  on public.leads (contact_id, organization_id);
create index if not exists leads_conversation_org_fk_idx
  on public.leads (conversation_id, organization_id);

create index if not exists bookings_contact_org_fk_idx
  on public.bookings (contact_id, organization_id);
create index if not exists bookings_conversation_org_fk_idx
  on public.bookings (conversation_id, organization_id);

create index if not exists actions_conversation_org_fk_idx
  on public.actions (conversation_id, organization_id);
create index if not exists actions_agent_org_fk_idx
  on public.actions (agent_id, organization_id);

create index if not exists platform_audit_logs_actor_user_idx
  on public.platform_audit_logs (actor_user_id);
create index if not exists platform_integrations_updated_by_idx
  on public.platform_integrations (updated_by);
