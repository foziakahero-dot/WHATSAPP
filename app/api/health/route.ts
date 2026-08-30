export const runtime = 'nodejs'

export async function GET() {
  return Response.json({
    service: 'convoops',
    status: 'ok',
    version: '0.1.0'
  })
}
