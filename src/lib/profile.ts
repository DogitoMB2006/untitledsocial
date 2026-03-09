import { supabase } from './supabaseClient'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  banner_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export async function getProfileByUserId(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single<Profile>()

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to fetch profile by user id', error)
    return null
  }

  return data
}

export async function getProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single<Profile>()

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to fetch profile by username', error)
    return null
  }

  return data
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single<Profile>()

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to update profile', error)
    throw error
  }

  return data
}

