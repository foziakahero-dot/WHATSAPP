'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppText } from '@/lib/whatsapp/send-message'

async function requireConversation(conversationId: string) {
  if (!conversationId) throw new Error('Missing conversation')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Authentication required')
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('id,organization_id,status,assigned_user_id,channel_id,contact_id')
    .eq('id', conversationId)
    .single()
  if (error || !conversation) throw new Error('Conversation not found')
  const { data: membership } = await supabase.from('organization_members').select('role').eq('organization_id', conversation.organization_id).eq('user_id', user.id).single()
  if (!membership) throw new Error('Workspace access denied')
  return { supabase, user, conversation, role: membership.role as string }
}

export async function takeOverConversation(formData: FormData) {
  const conversationId = String(formData.get('conversationId') || '')
  const { supabase, user, conversation } = await requireConversation(conversationId)
  const { error } = await supabase.from('conversations').update({ status: 'handoff', assigned_user_id: user.id, updated_at: new Date().toISOString() }).eq('id', conversation.id).eq('organization_id', conversation.organization_id)
  if (error) throw error
  await supabase.from('actions').insert({ organization_id: conversation.organization_id, conversation_id: conversation.id, action_type: 'human_takeover', status: 'completed', output: { assigned_user_id: user.id }, completed_at: new Date().toISOString() })
  revalidatePath('/app/inbox')
}

export async function releaseConversation(formData: FormData) {
  const conversationId = String(formData.get('conversationId') || '')
  const { supabase, user, conversation, role } = await requireConversation(conversationId)
  if (conversation.assigned_user_id !== user.id && !['owner','admin'].includes(role)) throw new Error('Only the assigned operator or an admin can release this conversation')
  const { error } = await supabase.from('conversations').update({ status: 'open', assigned_user_id: null, updated_at: new Date().toISOString() }).eq('id', conversation.id).eq('organization_id', conversation.organization_id)
  if (error) throw error
  await supabase.from('actions').insert({ organization_id: conversation.organization_id, conversation_id: conversation.id, action_type: 'human_release', status: 'completed', completed_at: new Date().toISOString() })
  revalidatePath('/app/inbox')
}

export async function sendHumanReply(formData: FormData) {
  const conversationId = String(formData.get('conversationId') || '')
  const body = String(formData.get('body') || '').trim()
  if (!body || body.length > 4096) throw new Error('Reply must contain 1–4096 characters')
  const { supabase, user, conversation, role } = await requireConversation(conversationId)
  if (conversation.status !== 'handoff') throw new Error('Take over the conversation before sending a human reply')
  if (conversation.assigned_user_id !== user.id && !['owner','admin'].includes(role)) throw new Error('Conversation is assigned to another operator')
  const [{ data: channel }, { data: contact }] = await Promise.all([
    supabase.from('channels').select('phone_number_id').eq('id', conversation.channel_id).eq('organization_id', conversation.organization_id).single(),
    supabase.from('contacts').select('phone').eq('id', conversation.contact_id).eq('organization_id', conversation.organization_id).single()
  ])
  if (!channel?.phone_number_id || !contact?.phone) throw new Error('WhatsApp channel or contact is incomplete')
  const sent = await sendWhatsAppText({ phoneNumberId: channel.phone_number_id, to: contact.phone, body })
  const providerMessageId = sent?.messages?.[0]?.id || null
  const now = new Date().toISOString()
  const { error } = await supabase.from('messages').insert({ organization_id: conversation.organization_id, conversation_id: conversation.id, direction: 'outbound', sender_type: 'human', body, provider_message_id: providerMessageId, metadata: { sent_by: user.id } })
  if (error) throw error
  await Promise.all([
    supabase.from('conversations').update({ last_message_at: now, updated_at: now }).eq('id', conversation.id).eq('organization_id', conversation.organization_id),
    supabase.from('actions').insert({ organization_id: conversation.organization_id, conversation_id: conversation.id, action_type: 'human_whatsapp_reply', status: 'completed', input: { body }, output: { provider_message_id: providerMessageId }, completed_at: now })
  ])
  revalidatePath('/app/inbox')
}
