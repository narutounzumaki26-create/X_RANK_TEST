import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { StepProvider } from "@/context/StepContext"
import RewardListener from "@/app/components/rewards/RewardListener"
import { Toaster } from "sonner"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "X-RANK",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <StepProvider>
          {children}
          {/* ✅ Listener global monté sur toutes les pages */}
          <RewardListener />
          {/* ✅ Toaster global de Sonner */}
          <Toaster richColors position="top-right" />
        </StepProvider>
      </body>
    </html>
  )
}
