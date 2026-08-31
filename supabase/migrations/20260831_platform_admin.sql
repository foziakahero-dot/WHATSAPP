create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner','admin','support','analyst')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_integrations (
  provider text primary key,
  display_name text not null,
  category text not null check (category in ('core','channel','ai','calendar','payments','crm','commerce','developer')),
  status text not null default 'not_configured' check (status in ('healthy','degraded','outage','not_configured','disabled')),
  environment text not null default 'production' check (environment in ('production','staging','development')),
  configuration jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz,
  error_message text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_audit_logs_created_idx on public.platform_audit_logs (created_at desc);
create index if not exists platform_integrations_status_idx on public.platform_integrations (status);

alter table public.platform_admins enable row level security;
alter table public.platform_integrations enable row level security;
alter table public.platform_audit_logs enable row level security;

create or replace function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid()) and pa.active
  );
$$;

revoke all on function private.is_platform_admin() from public, anon;
grant execute on function private.is_platform_admin() to authenticated;

drop policy if exists platform_admins_select on public.platform_admins;
create policy platform_admins_select on public.platform_admins for select to authenticated using (private.is_platform_admin());
drop policy if exists platform_integrations_select on public.platform_integrations;
create policy platform_integrations_select on public.platform_integrations for select to authenticated using (private.is_platform_admin());
drop policy if exists platform_integrations_update on public.platform_integrations;
create policy platform_integrations_update on public.platform_integrations for update to authenticated using (private.is_platform_admin()) with check (private.is_platform_admin());
drop policy if exists platform_audit_logs_select on public.platform_audit_logs;
create policy platform_audit_logs_select on public.platform_audit_logs for select to authenticated using (private.is_platform_admin());
drop policy if exists platform_audit_logs_insert on public.platform_audit_logs;
create policy platform_audit_logs_insert on public.platform_audit_logs for insert to authenticated with check (private.is_platform_admin() and actor_user_id = (select auth.uid()));

grant select on public.platform_admins to authenticated;
grant select, update on public.platform_integrations to authenticated;
grant select, insert on public.platform_audit_logs to authenticated;

insert into public.platform_integrations (provider, display_name, category) values
  ('supabase','Supabase','core'), ('vercel','Vercel','core'), ('whatsapp','WhatsApp Business','channel'),
  ('ai_gateway','Vercel AI Gateway','ai'), ('google_calendar','Google Calendar','calendar'),
  ('stripe','Stripe','payments'), ('hubspot','HubSpot','crm'), ('shopify','Shopify','commerce'),
  ('webhooks','API & Webhooks','developer')
on conflict (provider) do nothing;

-- Bootstrap the first administrator only after that user has signed up:
-- insert into public.platform_admins (user_id, role)
-- select id, 'owner' from auth.users where email = '<owner-email>';
