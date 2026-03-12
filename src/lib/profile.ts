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
  follower_count: number
  following_count: number
  is_followed_by_viewer: boolean
}

export interface ProfileListItem {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
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

export async function getFollowerCount(profileId: string) {
  const { count, error } = await supabase
    .from('follows')
    .select('follower_id', { count: 'exact', head: true })
    .eq('following_id', profileId)

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to fetch follower count', error)
    throw error
  }

  return count ?? 0
}

export async function getFollowingCount(profileId: string) {
  const { count, error } = await supabase
    .from('follows')
    .select('following_id', { count: 'exact', head: true })
    .eq('follower_id', profileId)

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to fetch following count', error)
    throw error
  }

  return count ?? 0
}

export async function getFollowState(viewerId: string | null | undefined, profileId: string) {
  if (!viewerId || viewerId === profileId) {
    return false
  }

  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', viewerId)
    .eq('following_id', profileId)
    .maybeSingle()

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to fetch follow state', error)
    throw error
  }

  return Boolean(data)
}

export async function fetchFollowers(profileId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select(
      'follower:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)',
    )
    .eq('following_id', profileId)
    .order('created_at', { ascending: false })

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to fetch followers', error)
    throw error
  }

  return (data ?? [])
    .map((row: any) => {
      const follower = Array.isArray(row.follower) ? row.follower[0] : row.follower
      if (!follower) return null

      return {
        id: follower.id as string,
        username: follower.username as string,
        display_name: (follower.display_name ?? null) as string | null,
        avatar_url: (follower.avatar_url ?? null) as string | null,
      } satisfies ProfileListItem
    })
    .filter((profile): profile is ProfileListItem => profile !== null)
}

export async function fetchFollowing(profileId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select(
      'following:profiles!follows_following_id_fkey(id, username, display_name, avatar_url)',
    )
    .eq('follower_id', profileId)
    .order('created_at', { ascending: false })

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to fetch following', error)
    throw error
  }

  return (data ?? [])
    .map((row: any) => {
      const following = Array.isArray(row.following) ? row.following[0] : row.following
      if (!following) return null

      return {
        id: following.id as string,
        username: following.username as string,
        display_name: (following.display_name ?? null) as string | null,
        avatar_url: (following.avatar_url ?? null) as string | null,
      } satisfies ProfileListItem
    })
    .filter((profile): profile is ProfileListItem => profile !== null)
}

async function buildProfileWithStats(profile: Profile, viewerId?: string | null) {
  const [
    { count: postCount },
    { count: commentCount },
    followerCount,
    followingCount,
    isFollowedByViewer,
  ] = await Promise.all([
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id),
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id),
    getFollowerCount(profile.id),
    getFollowingCount(profile.id),
    getFollowState(viewerId, profile.id),
  ])

  return {
    ...profile,
    post_count: postCount ?? 0,
    comment_count: commentCount ?? 0,
    follower_count: followerCount,
    following_count: followingCount,
    is_followed_by_viewer: isFollowedByViewer,
  } satisfies ProfileWithStats
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

export async function getProfileWithStatsByUserId(userId: string, viewerId?: string | null) {
  const profile = await getProfileByUserId(userId)
  if (!profile) {
    return null
  }

  return buildProfileWithStats(profile, viewerId)
}

export async function getProfileWithStatsByUsername(username: string, viewerId?: string | null) {
  const profile = await getProfileByUsername(username)
  if (!profile) {
    return null
  }

  return buildProfileWithStats(profile, viewerId)
}

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new Error('You cannot follow yourself.')
  }

  const { error } = await supabase
    .from('follows')
    .upsert(
      {
        follower_id: followerId,
        following_id: followingId,
      },
      {
        onConflict: 'follower_id,following_id',
      },
    )

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to follow user', error)
    throw error
  }
}

export async function unfollowUser(followerId: string, followingId: string) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to unfollow user', error)
    throw error
  }
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

