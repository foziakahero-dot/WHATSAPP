# CONVOOPS MVP architecture

## Product thesis
We do not automate messages. We automate the work that starts with a message.

CONVOOPS is a multi-tenant conversational operations platform. WhatsApp is the first channel; the architecture is intentionally channel-independent so Instagram, web chat, SMS/RCS, email and voice can be added later.

## Core runtime flow
Customer WhatsApp → Meta Cloud API webhook → CONVOOPS route handler → agent engine → knowledge + business tools → action policy/approval → business system → WhatsApp reply.

## MVP modules
1. Business onboarding and authentication
2. WhatsApp channel connection
3. AI receptionist
4. Multilingual conversations
5. Knowledge sources
6. Lead qualification
7. Booking/action engine
8. Human takeover/shared inbox
9. Owner operations dashboard

## Data model
Every business-owned row is scoped by `organization_id`. Public tables use Row Level Security. Membership checks are implemented through narrowly scoped helper functions in a non-exposed `private` schema to avoid recursive membership policies.

Core entities:
- organizations
- organization_members
- channels
- agents
- knowledge_sources
- contacts
- conversations
- messages
- leads
- bookings
- actions

## Security boundaries
- Browser uses only `NEXT_PUBLIC_SUPABASE_URL` and the publishable key.
- `SUPABASE_SECRET_KEY`, OpenAI credentials and WhatsApp credentials are server-only.
- Server-only service credentials must never use a `NEXT_PUBLIC_` prefix.
- WhatsApp webhook verification and signature validation happen server-side.
- Risky agent actions will support `approval_required` before execution.
- Organization creation/member administration happens through trusted server-side flows.

## Initial agent
Maya — Receptionist & Booking

Allowed MVP actions:
- Answer business questions
- Detect and reply in the customer language
- Capture contact details
- Qualify a lead
- Create a booking
- Send a follow-up inside permitted messaging rules
- Escalate to a human

Not allowed by default:
- Refunds
- Discounts above policy
- Destructive data changes
- Financial commitments without approval

## North-star metric
Successful AI Actions per Active Business.
