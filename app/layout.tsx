import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CONVOOPS — AI employees for customer conversations',
  description: 'Turn customer conversations into completed business actions.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
