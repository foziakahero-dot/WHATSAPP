import { createHmac, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'

function verifyMetaSignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret || !signatureHeader?.startsWith('sha256=')) return false

  const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`
  const providedBuffer = Buffer.from(signatureHeader)
  const expectedBuffer = Buffer.from(expected)

  if (providedBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(providedBuffer, expectedBuffer)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (
    mode === 'subscribe' &&
    token &&
    challenge &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new Response(challenge, { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifyMetaSignature(rawBody, signature)) {
    return Response.json({ error: 'Invalid Meta signature' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Next step: normalize inbound WhatsApp events, persist them in Supabase,
  // enqueue agent processing, and send the resulting reply via Meta Cloud API.
  console.info('WhatsApp webhook received', { payload })

  return Response.json({ received: true })
}
