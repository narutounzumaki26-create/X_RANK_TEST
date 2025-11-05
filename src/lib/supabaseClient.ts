// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

export const supabasepwd = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)


export const supabasepwd = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: 'implicit', // Use implicit flow instead of PKCE
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)
