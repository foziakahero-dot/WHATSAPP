# CONVOOPS

**Talk. Act. Done.**

CONVOOPS is a conversational operations platform that gives businesses AI employees for customer conversations. WhatsApp is the first channel; the long-term product is channel-independent.

## MVP
- AI receptionist
- Multilingual replies
- Lead qualification
- Booking/actions
- Human takeover
- Owner dashboard

## Stack
- Next.js 16.3.3
- React 19.2.8
- Supabase
- Vercel-ready
- Meta WhatsApp Cloud API (next integration)
- OpenAI agent/tool calling (next integration)

## Live backend
- Supabase project: `convoops`
- Project ref: `krvymmfzpemhngrrbhfs`
- Region: `eu-north-1`
- API URL: `https://krvymmfzpemhngrrbhfs.supabase.co`
- RLS enabled on all business tables
- Security advisor: clean at initial setup

## Setup
1. Copy `.env.example` to `.env.local`.
2. Add the Supabase URL and publishable key.
3. Apply `supabase/schema.sql` and migrations only when provisioning another environment.
4. Install dependencies with `npm install`.
5. Run `npm run dev`.
