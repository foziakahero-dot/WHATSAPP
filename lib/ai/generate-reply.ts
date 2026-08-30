import 'server-only'

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

function extractOutputText(payload: any): string {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim()
  }

  const chunks: string[] = []
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if ((content?.type === 'output_text' || content?.type === 'text') && typeof content?.text === 'string') {
        chunks.push(content.text)
      }
    }
  }

  return chunks.join('\n').trim()
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
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL || 'gpt-5'

  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY')
  }

  const knowledgeText = knowledge
    .filter((source) => source.content)
    .map((source) => `# ${source.title || 'Business knowledge'}\n${source.content}`)
    .join('\n\n')
    .slice(0, 12000)

  const transcript = history
    .filter((message) => message.body)
    .slice(-16)
    .map((message) => {
      const role = message.sender_type === 'customer' ? 'Customer' : message.sender_type === 'human' ? 'Human agent' : 'AI'
      return `${role}: ${message.body}`
    })
    .join('\n')

  const instructions = [
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

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      instructions,
      input: customerMessage,
      max_output_tokens: 500
    })
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`OpenAI response failed (${response.status}): ${detail.slice(0, 500)}`)
  }

  const payload = await response.json()
  const reply = extractOutputText(payload)

  if (!reply) {
    throw new Error('OpenAI returned an empty reply')
  }

  return reply
}
