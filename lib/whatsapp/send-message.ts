import 'server-only'

export async function sendWhatsAppText({
  phoneNumberId,
  to,
  body
}: {
  phoneNumberId: string
  to: string
  body: string
}) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION

  if (!accessToken) throw new Error('Missing WHATSAPP_ACCESS_TOKEN')
  if (!apiVersion) throw new Error('Missing WHATSAPP_GRAPH_API_VERSION')

  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: body.slice(0, 4096)
      }
    })
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(`WhatsApp send failed (${response.status}): ${JSON.stringify(payload).slice(0, 600)}`)
  }

  return payload
}
