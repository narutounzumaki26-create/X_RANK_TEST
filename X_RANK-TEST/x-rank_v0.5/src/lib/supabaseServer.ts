// src/lib/supabaseServer.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies as getCookies } from "next/headers"

export function createSupabaseServerClient() {
  // 🧠 Compatibilité universelle : cookies() peut être sync ou async selon le runtime
  const cookieStoreOrPromise = getCookies() as unknown

  // Si cookies() renvoie une Promise (Edge/Vercel), on attend sa résolution
  const getCookieStore = async () =>
    cookieStoreOrPromise instanceof Promise
      ? await cookieStoreOrPromise
      : (cookieStoreOrPromise as ReturnType<typeof getCookies>)

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await getCookieStore()
          return cookieStore.get(name)?.value
        },
        async set(name: string, value: string, options: CookieOptions) {
          const cookieStore = await getCookieStore()
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // ignore
          }
        },
        async remove(name: string, options: CookieOptions) {
          const cookieStore = await getCookieStore()
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 })
          } catch {
            // ignore
          }
        },
      },
    }
  )
}
