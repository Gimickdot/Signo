import './global.css'
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { baseUrl } from './sitemap'
import { ClientLayout } from './components/client-layout'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Signo FSL Learning Application',
    template: '%s | Signo FSL Learning Application',
  },
  description: 'This is the Signo FSL Learning Application webapp.',
  openGraph: {
    title: 'Signo FSL Learning Application',
    description: 'This is the Signo FSL Learning Application webapp.',
    url: baseUrl,
    siteName: 'Signo FSL Learning Application',
    locale: 'en_US',
    type: 'website',
  },
  icons: {
    icon: '/icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

const cx = (...classes) => classes.filter(Boolean).join(' ')

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={cx(
        'text-black bg-white dark:text-white dark:bg-black',
        GeistSans.variable,
        GeistMono.variable
      )}
    >
      <body className="antialiased w-full min-h-screen m-0 p-0 bg-slate-950 text-slate-100">
        <ClientLayout>
          {children}
        </ClientLayout>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
