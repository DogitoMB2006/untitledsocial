import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

interface AuthContextValue {
  user: User | null
  session: Session | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Ensures a profile row exists for the given user.
 * If the user was created directly in Supabase Auth (bypassing the registration
 * form), they won't have a profile row, which causes a FK violation when posting.
 */
async function ensureProfile(user: User) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (existing) return // profile already exists, nothing to do

  // Derive a fallback username from the email (part before @)
  const emailUsername = (user.email ?? 'user').split('@')[0].replace(/[^a-z0-9_]/gi, '_')
  const fallbackUsername = `${emailUsername}_${user.id.slice(0, 6)}`

  await supabase.from('profiles').insert({
    id: user.id,
    username: fallbackUsername,
    display_name: emailUsername,
    avatar_url: null,
  })
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      const currentUser = data.session?.user ?? null
      if (currentUser) await ensureProfile(currentUser)
      setSession(data.session)
      setUser(currentUser)
      setIsLoading(false)
    }

    void init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const nextUser = newSession?.user ?? null
      if (nextUser) void ensureProfile(nextUser)
      setSession(newSession)
      setUser(nextUser)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

