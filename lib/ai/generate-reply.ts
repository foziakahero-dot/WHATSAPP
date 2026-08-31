import 'server-only'
import { generateText } from 'ai'

type Message = {
  sender_type: 'customer' | 'ai' | 'human' | 'system'
  body: string | null
}

type Agent = {
  name: string
  role: string
  instructions: string | null
}

type KnowledgeSource = {
  title: string | null
  content: string | null
}

export async function generateAgentReply({
  agent,
  history,
  knowledge,
  customerMessage
}: {
  agent: Agent
  history: Message[]
  knowledge: KnowledgeSource[]
  customerMessage: string
}) {
  const knowledgeText = knowledge
    .filter((source) => source.content)
    .map((source) => `# ${source.title || 'Business knowledge'}\n${source.content}`)
    .join('\n\n')
    .slice(0, 12000)

  const transcriptMessages = history.at(-1)?.sender_type === 'customer' && history.at(-1)?.body?.trim() === customerMessage.trim()
    ? history.slice(0, -1)
    : history

  const transcript = transcriptMessages
    .filter((message) => message.body)
    .slice(-16)
    .map((message) => {
      const role = message.sender_type === 'customer' ? 'Customer' : message.sender_type === 'human' ? 'Human agent' : 'AI'
      return `${role}: ${message.body}`
    })
    .join('\n')

  const system = [
    `You are ${agent.name}, the ${agent.role} for this business.`,
    'Reply in the same language as the customer unless they explicitly request another language.',
    'Be concise, helpful, warm, and commercially useful.',
    'Never invent prices, availability, policies, bookings, payments, or facts that are not present in the supplied business knowledge or conversation.',
    'If information is missing, ask one clear follow-up question or offer a human handoff.',
    'Do not claim an action has been completed unless the system has actually completed it.',
    agent.instructions || '',
    knowledgeText ? `\nBusiness knowledge:\n${knowledgeText}` : '',
    transcript ? `\nRecent conversation:\n${transcript}` : ''
  ]
    .filter(Boolean)
    .join('\n')

  const { text } = await generateText({
    model: process.env.AI_MODEL || 'openai/gpt-5.6-sol',
    system,
    prompt: customerMessage,
    maxOutputTokens: 500
  })

  const reply = text.trim()
  if (!reply) throw new Error('AI Gateway returned an empty reply')
  return reply
}
