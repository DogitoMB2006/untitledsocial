import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[NebulaX] Supabase URL or anon key is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.',
  )
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[NebulaX] Supabase environment variables are not configured. See supabaseClient.ts for details.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// TODO: Add auth helpers here, e.g.:
// export async function loginWithEmail(email: string, password: string) { ... }
// export async function registerWithEmail(email: string, password: string) { ... }

