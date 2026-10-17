import type { Metadata } from 'next'
import '@/styles/globals.css'
import '@/styles/components.css'

// ── FAVICON ────────────────────────────────────────────────────────────────
// Lege dein Favicon-Bild in den public/ Ordner und trage den Pfad hier ein:
const FAVICON_PATH = '/favicon.png'  // ← Hier deinen Pfad eintragen
// ──────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Notafix',
  description: 'Schulnoten einfach verwalten',
  manifest: '/manifest.json',
  icons: {
    icon: FAVICON_PATH,
    apple: FAVICON_PATH,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0f0f13" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href={FAVICON_PATH} />
      </head>
      <body>{children}</body>
    </html>
  )
}
