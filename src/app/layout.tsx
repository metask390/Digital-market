import type { Metadata, Viewport } from 'next'
import '@fontsource/lilita-one/400.css'
import '@fontsource-variable/nunito'
import './globals.css'

export const metadata: Metadata = {
  title: 'Egg Market - 3D Chicken Farm',
  description: 'Buy chickens, collect golden eggs every 24 hours and sell them at Egg Market.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1f9d55',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="pasture min-h-screen antialiased">{children}</body>
    </html>
  )
}
