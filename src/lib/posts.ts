import { supabase } from './supabaseClient'

export interface PostAuthor {
  username: string
  display_name: string | null
  avatar_url: string | null
}

export interface Post {
  id: string
  user_id: string
  content: string
  created_at: string
  image_urls: string[]
  profiles?: PostAuthor
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  parent_comment_id: string | null
  image_urls: string[]
  profiles?: PostAuthor
}

export interface LikeState {
  liked: boolean
  count: number
}

export async function fetchRecentPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, content, created_at, image_urls, profiles:profiles!posts_user_id_fkey(username, display_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) {
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[NebulaX] Failed to fetch posts', error)
    }
    return []
  }

  return data.map((row: any) => {
    const authors = Array.isArray(row.profiles) ? row.profiles : row.profiles ? [row.profiles] : []
    const author = authors[0]
    return {
      id: row.id as string,
      user_id: row.user_id as string,
      content: row.content as string,
      created_at: row.created_at as string,
      image_urls: (row.image_urls ?? []) as string[],
      profiles: author
        ? {
            username: author.username as string,
            display_name: (author.display_name ?? null) as string | null,
            avatar_url: (author.avatar_url ?? null) as string | null,
          }
        : undefined,
    } satisfies Post
  })
}

export async function createPost(userId: string, content: string, imageUrls: string[] = []) {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      content,
      image_urls: imageUrls,
    })
    .select('id, user_id, content, created_at, image_urls')
    .single()

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to create post', error)
    throw error
  }

  // Fetch the author profile separately to avoid the FK join failing due to RLS
  const { data: profileData } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', userId)
    .single()

  return {
    id: data.id as string,
    user_id: data.user_id as string,
    content: data.content as string,
    created_at: data.created_at as string,
    image_urls: (data.image_urls ?? []) as string[],
    profiles: profileData
      ? {
          username: profileData.username as string,
          display_name: (profileData.display_name ?? null) as string | null,
          avatar_url: (profileData.avatar_url ?? null) as string | null,
        }
      : undefined,
  } satisfies Post
}

export async function fetchComments(postId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('id, post_id, user_id, content, created_at, parent_comment_id, image_urls, profiles(username, display_name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error || !data) {
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[NebulaX] Failed to fetch comments', error)
    }
    return []
  }

  return data.map((row: any) => {
    const authors = Array.isArray(row.profiles) ? row.profiles : row.profiles ? [row.profiles] : []
    const author = authors[0]
    return {
      id: row.id as string,
      post_id: row.post_id as string,
      user_id: row.user_id as string,
      content: row.content as string,
      created_at: row.created_at as string,
      parent_comment_id: (row.parent_comment_id ?? null) as string | null,
      image_urls: (row.image_urls ?? []) as string[],
      profiles: author
        ? {
            username: author.username as string,
            display_name: (author.display_name ?? null) as string | null,
            avatar_url: (author.avatar_url ?? null) as string | null,
          }
        : undefined,
    } satisfies Comment
  })
}

export async function fetchPostsByUserId(userId: string, limit = 30) {
  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, content, created_at, image_urls, profiles:profiles!posts_user_id_fkey(username, display_name, avatar_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[NebulaX] Failed to fetch user posts', error)
    }
    return []
  }

  return data.map((row: any) => {
    const authors = Array.isArray(row.profiles) ? row.profiles : row.profiles ? [row.profiles] : []
    const author = authors[0]
    return {
      id: row.id as string,
      user_id: row.user_id as string,
      content: row.content as string,
      created_at: row.created_at as string,
      image_urls: (row.image_urls ?? []) as string[],
      profiles: author
        ? {
            username: author.username as string,
            display_name: (author.display_name ?? null) as string | null,
            avatar_url: (author.avatar_url ?? null) as string | null,
          }
        : undefined,
    } satisfies Post
  })
}

export async function fetchCommentsByUserId(userId: string, limit = 40) {
  const { data, error } = await supabase
    .from('comments')
    .select('id, post_id, user_id, content, created_at, parent_comment_id, image_urls, profiles(username, display_name, avatar_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[NebulaX] Failed to fetch user comments', error)
    }
    return []
  }

  return data.map((row: any) => {
    const authors = Array.isArray(row.profiles) ? row.profiles : row.profiles ? [row.profiles] : []
    const author = authors[0]
    return {
      id: row.id as string,
      post_id: row.post_id as string,
      user_id: row.user_id as string,
      content: row.content as string,
      created_at: row.created_at as string,
      parent_comment_id: (row.parent_comment_id ?? null) as string | null,
      image_urls: (row.image_urls ?? []) as string[],
      profiles: author
        ? {
            username: author.username as string,
            display_name: (author.display_name ?? null) as string | null,
            avatar_url: (author.avatar_url ?? null) as string | null,
          }
        : undefined,
    } satisfies Comment
  })
}

export async function createComment(
  postId: string,
  userId: string,
  content: string,
  options?: { parentCommentId?: string; imageUrls?: string[] },
) {
  const parentCommentId = options?.parentCommentId ?? null
  const imageUrls = options?.imageUrls ?? []
  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: userId,
      content,
      parent_comment_id: parentCommentId,
      image_urls: imageUrls,
    })
    .select('id, post_id, user_id, content, created_at, parent_comment_id, image_urls, profiles(username, display_name, avatar_url)')
    .single()

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to create comment', error)
    throw error
  }

  const authors = Array.isArray((data as any).profiles)
    ? (data as any).profiles
    : (data as any).profiles
      ? [(data as any).profiles]
      : []
  const author = authors[0]

  return {
    id: data.id as string,
    post_id: data.post_id as string,
    user_id: data.user_id as string,
    content: data.content as string,
    created_at: data.created_at as string,
    parent_comment_id: (data.parent_comment_id ?? null) as string | null,
    image_urls: (data.image_urls ?? []) as string[],
    profiles: author
      ? {
          username: author.username as string,
          display_name: (author.display_name ?? null) as string | null,
          avatar_url: (author.avatar_url ?? null) as string | null,
        }
      : undefined,
  } satisfies Comment
}

export async function fetchLikeState(postId: string, userId: string | null): Promise<LikeState> {
  const { count } = await supabase
    .from('post_likes')
    .select('user_id', { count: 'exact', head: true })
    .eq('post_id', postId)

  let liked = false

  if (userId) {
    const { data: userLike } = await supabase
      .from('post_likes')
      .select('user_id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle()

    liked = !!userLike
  }

  return {
    liked,
    count: count ?? 0,
  }
}

export async function likePost(postId: string, userId: string) {
  const { error } = await supabase
    .from('post_likes')
    .upsert(
      {
        post_id: postId,
        user_id: userId,
      },
      {
        onConflict: 'post_id,user_id',
      },
    )

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to like post', error)
    throw error
  }
}

export async function unlikePost(postId: string, userId: string) {
  const { error } = await supabase
    .from('post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId)

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to unlike post', error)
    throw error
  }
}

export async function deletePost(postId: string, userId: string) {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId)

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to delete post', error)
    throw error
  }
}

export async function deleteComment(commentId: string, userId: string) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId)

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to delete comment', error)
    throw error
  }
}



