import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { generateAgentReply } from '@/lib/ai/generate-reply'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppText } from '@/lib/whatsapp/send-message'

export const runtime = 'nodejs'

function verifySignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET

  if (!appSecret) {
    return process.env.NODE_ENV !== 'production'
  }

  if (!signatureHeader?.startsWith('sha256=')) return false

  const providedHex = signatureHeader.slice('sha256='.length)
  const expectedHex = createHmac('sha256', appSecret).update(rawBody).digest('hex')

  try {
    const provided = Buffer.from(providedHex, 'hex')
    const expected = Buffer.from(expectedHex, 'hex')
    return provided.length === expected.length && timingSafeEqual(provided, expected)
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode')
  const verifyToken = request.nextUrl.searchParams.get('hub.verify_token')
  const challenge = request.nextUrl.searchParams.get('hub.challenge')

  if (
    mode === 'subscribe' &&
    verifyToken &&
    challenge &&
    verifyToken === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Webhook verification failed' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  if (!verifySignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const change = payload?.entry?.[0]?.changes?.[0]?.value
  const inbound = change?.messages?.[0]
  const phoneNumberId = change?.metadata?.phone_number_id

  if (!inbound || !phoneNumberId) {
    return NextResponse.json({ received: true })
  }

  if (inbound.type !== 'text' || !inbound.text?.body) {
    return NextResponse.json({ received: true, ignored: inbound.type || 'unknown' })
  }

  const customerPhone = inbound.from
  const customerMessage = inbound.text.body.trim()
  const providerMessageId = inbound.id
  const displayName = change?.contacts?.[0]?.profile?.name || null

  const supabase = createAdminClient()

  try {
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('id')
      .eq('provider_message_id', providerMessageId)
      .maybeSingle()

    if (existingMessage) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, organization_id, phone_number_id')
      .eq('provider', 'whatsapp')
      .eq('phone_number_id', phoneNumberId)
      .eq('status', 'active')
      .maybeSingle()

    if (channelError) throw channelError
    if (!channel) {
      return NextResponse.json({ received: true, unconfigured_channel: phoneNumberId })
    }

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .upsert(
        {
          organization_id: channel.organization_id,
          external_id: customerPhone,
          phone: customerPhone,
          display_name: displayName,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'organization_id,external_id' }
      )
      .select('id, language')
      .single()

    if (contactError) throw contactError

    const { data: activeAgent } = await supabase
      .from('agents')
      .select('id, name, role, instructions')
      .eq('organization_id', channel.organization_id)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    let { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, agent_id, status')
      .eq('organization_id', channel.organization_id)
      .eq('channel_id', channel.id)
      .eq('contact_id', contact.id)
      .in('status', ['open', 'handoff'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (conversationError) throw conversationError

    if (!conversation) {
      const created = await supabase
        .from('conversations')
        .insert({
          organization_id: channel.organization_id,
          channel_id: channel.id,
          contact_id: contact.id,
          agent_id: activeAgent?.id || null,
          status: 'open',
          last_message_at: new Date().toISOString()
        })
        .select('id, agent_id, status')
        .single()

      if (created.error) throw created.error
      conversation = created.data
    }

    const { error: inboundError } = await supabase.from('messages').insert({
      organization_id: channel.organization_id,
      conversation_id: conversation.id,
      direction: 'inbound',
      sender_type: 'customer',
      body: customerMessage,
      provider_message_id: providerMessageId,
      metadata: { whatsapp_type: inbound.type }
    })

    if (inboundError) throw inboundError

    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation.id)

    if (conversation.status === 'handoff' || !activeAgent) {
      return NextResponse.json({ received: true, handoff: conversation.status === 'handoff' })
    }

    const [{ data: history }, { data: knowledge }] = await Promise.all([
      supabase
        .from('messages')
        .select('sender_type, body, created_at')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('knowledge_sources')
        .select('title, content')
        .eq('organization_id', channel.organization_id)
        .eq('status', 'ready')
        .limit(12)
    ])

    const reply = await generateAgentReply({
      agent: activeAgent,
      history: [...(history || [])].reverse() as any,
      knowledge: (knowledge || []) as any,
      customerMessage
    })

    const sent = await sendWhatsAppText({
      phoneNumberId,
      to: customerPhone,
      body: reply
    })

    const outboundProviderMessageId = sent?.messages?.[0]?.id || null

    const { error: outboundError } = await supabase.from('messages').insert({
      organization_id: channel.organization_id,
      conversation_id: conversation.id,
      direction: 'outbound',
      sender_type: 'ai',
      body: reply,
      provider_message_id: outboundProviderMessageId,
      metadata: { model: process.env.AI_MODEL || 'openai/gpt-5.6-sol' }
    })

    if (outboundError) throw outboundError

    await supabase.from('actions').insert({
      organization_id: channel.organization_id,
      conversation_id: conversation.id,
      agent_id: activeAgent.id,
      action_type: 'whatsapp_ai_reply',
      status: 'completed',
      input: { provider_message_id: providerMessageId },
      output: { provider_message_id: outboundProviderMessageId },
      completed_at: new Date().toISOString()
    })

    return NextResponse.json({ received: true, replied: true })
  } catch (error) {
    console.error('WhatsApp webhook processing failed', error)
    return NextResponse.json({ received: true, processing_error: true }, { status: 200 })
  }
}
