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

export interface ProfileWithStats extends Profile {
  post_count: number
  comment_count: number
}

export interface ProfileUpdateInput {
  username?: string
  display_name?: string | null
  bio?: string | null
  avatar_url?: string | null
  banner_url?: string | null
}

export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/
export const MAX_BIO_LENGTH = 280

function normalizeUsername(username: string) {
  return username.trim().toLowerCase()
}

function sanitizeText(value: string | null | undefined) {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function validateProfileInput(input: ProfileUpdateInput) {
  const errors: Partial<Record<keyof ProfileUpdateInput, string>> = {}

  if (typeof input.username === 'string') {
    const username = normalizeUsername(input.username)
    if (!USERNAME_PATTERN.test(username)) {
      errors.username = 'Username must be 3-24 chars: lowercase letters, numbers, or _.'
    }
  }

  if (typeof input.bio === 'string' && input.bio.length > MAX_BIO_LENGTH) {
    errors.bio = `Bio must be ${MAX_BIO_LENGTH} characters or fewer.`
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

function sanitizeProfileUpdates(updates: ProfileUpdateInput) {
  const payload: ProfileUpdateInput = {}

  if (updates.username !== undefined) {
    payload.username = normalizeUsername(updates.username)
  }
  if (updates.display_name !== undefined) {
    payload.display_name = sanitizeText(updates.display_name)
  }
  if (updates.bio !== undefined) {
    payload.bio = sanitizeText(updates.bio)
  }
  if (updates.avatar_url !== undefined) {
    payload.avatar_url = sanitizeText(updates.avatar_url)
  }
  if (updates.banner_url !== undefined) {
    payload.banner_url = sanitizeText(updates.banner_url)
  }

  return payload
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
    .eq('username', normalizeUsername(username))
    .single<Profile>()

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to fetch profile by username', error)
    return null
  }

  return data
}

export async function isUsernameAvailable(username: string, currentUserId?: string) {
  const normalized = normalizeUsername(username)
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', normalized)
    .maybeSingle<{ id: string }>()

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to check username availability', error)
    throw error
  }

  if (!data) return true
  if (currentUserId && data.id === currentUserId) return true
  return false
}

export async function getProfileWithStatsByUsername(username: string) {
  const profile = await getProfileByUsername(username)
  if (!profile) {
    return null
  }

  const [{ count: postCount }, { count: commentCount }] = await Promise.all([
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id),
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id),
  ])

  return {
    ...profile,
    post_count: postCount ?? 0,
    comment_count: commentCount ?? 0,
  } satisfies ProfileWithStats
}

export async function updateProfile(userId: string, updates: ProfileUpdateInput) {
  const payload = sanitizeProfileUpdates(updates)
  const validation = validateProfileInput(payload)
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0] ?? 'Invalid profile update data.'
    throw new Error(firstError)
  }

  if (payload.username) {
    const available = await isUsernameAvailable(payload.username, userId)
    if (!available) {
      throw new Error('That username is already taken. Try another one.')
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
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

