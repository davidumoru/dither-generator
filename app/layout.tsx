import type { Metadata } from "next"
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Dither Generator",
  description:
    "Browser-based image dithering tool. Upload an image, choose an algorithm, tweak the parameters, and download the result.",
  keywords: [
    "dither",
    "dithering",
    "floyd-steinberg",
    "atkinson",
    "ordered dithering",
    "bayer matrix",
    "stucki",
    "burkes",
    "sierra",
    "pixel art",
    "image processing",
  ],
  authors: [{ name: "David Umoru", url: "https://twitter.com/theumoru" }],
  creator: "David Umoru",
  openGraph: {
    type: "website",
    title: "Dither Generator",
    description:
      "Browser-based image dithering tool. Upload an image, choose an algorithm, tweak the parameters, and download the result.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dither Generator",
    description:
      "Browser-based image dithering tool. Upload an image, choose an algorithm, tweak the parameters, and download the result.",
    creator: "@theumoru",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
}

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontSans.variable,
        "font-mono",
        jetbrainsMono.variable
      )}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
