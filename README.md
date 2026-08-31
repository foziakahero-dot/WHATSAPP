# CONVOOPS

**Talk. Act. Done.**

CONVOOPS is a multi-tenant conversational operations platform. A Next.js app
serves the public website, customer workspace, superadmin panel and WhatsApp
webhooks. Supabase provides Postgres, Auth and row-level authorization. Vercel
hosts preview and production deployments.

## Product surfaces

- `/` — public landing page
- `/login` — sign up and sign in
- `/app/*` — authenticated customer workspace
- `/admin/*` — platform-admin workspace
- `/api/webhooks/whatsapp` — canonical Meta webhook
- `/api/whatsapp/webhook` — backward-compatible webhook alias

## Stack

- Next.js 16 and React 19
- Supabase Postgres, Auth and RLS
- Meta WhatsApp Cloud API
- Vercel AI Gateway through the AI SDK
- Vercel deployments connected to GitHub

## Local setup

1. Install Node.js 22.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local`.
4. Add the Supabase URL and publishable key.
5. Add server-only credentials only when testing the related integration.
6. Run `npm run dev`.

Never commit `.env.local`. Values beginning with `NEXT_PUBLIC_` are included in
the browser bundle; secret, WhatsApp and AI keys must never use that prefix.

## Required environments

| Variable | Local | Preview | Production | Exposure |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | yes | yes | browser-safe |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | yes | yes | browser-safe |
| `SUPABASE_SECRET_KEY` | admin data | yes | yes | server-only |
| `AI_GATEWAY_API_KEY` | AI testing | optional | optional | server-only |
| `AI_MODEL` | optional | optional | optional | server-only |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp testing | optional | yes | server-only |
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp testing | optional | yes | server-only |
| `WHATSAPP_APP_SECRET` | WhatsApp testing | optional | yes | server-only |
| `WHATSAPP_GRAPH_API_VERSION` | WhatsApp testing | optional | yes | server-only |

Vercel deployments can use their automatically injected OIDC token for AI
Gateway. `AI_GATEWAY_API_KEY` remains useful for ordinary local development.

## Database workflow

The live Supabase project is `krvymmfzpemhngrrbhfs` in `eu-north-1`. Schema
changes live in `supabase/migrations`. All exposed business and platform tables
must keep RLS enabled, and cross-workspace admin reads must happen only after
the server-side platform-admin authorization check.

## Delivery workflow

1. Push work to a non-production branch.
2. GitHub Actions runs install, production build, typecheck and dependency audit.
3. Vercel creates a preview deployment.
4. Verify landing page, authentication, workspace, admin guard and API health.
5. Merge the approved pull request into `main` to create production.

Database migrations are applied and verified before promoting the matching
application build. Production secrets live in Vercel, never in GitHub.

## First platform administrator

The user must sign up and confirm their email first. Then bootstrap that exact
user once through a privileged database session:

```sql
insert into public.platform_admins (user_id, role)
select id, 'owner'
from auth.users
where email = '<confirmed-owner-email>'
on conflict (user_id) do update set role = excluded.role, active = true;
```

Do not expose this operation as a public signup path.
