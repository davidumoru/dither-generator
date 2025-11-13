import type React from "react"
import type { Metadata } from "next"
import { JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Dither Generator - Create Artistic Dithered Images",
  description:
    "Free online dither generator tool. Apply Floyd-Steinberg, Atkinson, Ordered, and other dithering algorithms to your images. Customize colors and download high-quality dithered artwork.",
  keywords: [
    "dither",
    "dithering",
    "image processing",
    "Floyd-Steinberg",
    "Atkinson",
    "ordered dithering",
    "pixel art",
    "image generator",
    "art tool",
  ],
  authors: [{ name: "David Umoru", url: "https://x.com/theumoru" }],
  creator: "David Umoru",
  publisher: "David Umoru",
  generator: "v0.app",
  metadataBase: new URL("https://dither.davidumoru.me/"),
  openGraph: {
    type: "website",
    title: "Dither Generator - Create Artistic Dithered Images",
    description:
      "Free online tool to apply dithering algorithms to your images. Choose from multiple algorithms, customize colors, and create unique artistic effects.",
    siteName: "Dither Generator",
    images: [
      {
        url: "/images/og.png",
        width: 1200,
        height: 630,
        alt: "Dither Generator - Create artistic dithered images with multiple algorithms",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dither Generator - Create Artistic Dithered Images",
    description:
      "Free online tool to apply dithering algorithms to your images. Customize colors and create unique artistic effects.",
    creator: "@theumoru",
    images: ["/images/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      {
        url: "/favicon-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.className} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
