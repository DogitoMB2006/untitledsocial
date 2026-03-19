import { supabase } from './supabaseClient'

export interface DirectMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  is_read: boolean
}

export interface ConversationParticipant {
  id: string
  user_id: string
  conversation_id: string
  last_read_at: string | null
  profiles: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

export interface ConversationWithParticipant {
  id: string
  created_at: string
  updated_at: string
  participant: ConversationParticipant['profiles']
  last_message: DirectMessage | null
  unread_count: number
}

export async function checkIfFollowing(userId1: string, userId2: string): Promise<boolean> {
  // Check if either user follows the other
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .or(`and(follower_id.eq.${userId1},following_id.eq.${userId2}),and(follower_id.eq.${userId2},following_id.eq.${userId1})`)
    .maybeSingle()

  if (error) {
    console.error('[NebulaX] Failed to check follow relationship', error)
    return false
  }

  return !!data
}

export async function getOrCreateConversation(userId1: string, userId2: string) {
  // First check if users follow each other
  const areFollowing = await checkIfFollowing(userId1, userId2)

  if (!areFollowing) {
    throw new Error('Users must follow each other to start a conversation')
  }

  // Try using the RPC function first
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_or_create_conversation', {
      user_id_1: userId1,
      user_id_2: userId2,
    })

  if (!rpcError && rpcData) {
    return rpcData as string
  }

  // Fallback to manual creation
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant_1_id', userId1)
    .eq('participant_2_id', userId2)
    .maybeSingle()

  if (existing) {
    return existing.id
  }

  const { data: existingReverse } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant_1_id', userId2)
    .eq('participant_2_id', userId1)
    .maybeSingle()

  if (existingReverse) {
    return existingReverse.id
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      participant_1_id: userId1,
      participant_2_id: userId2,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[NebulaX] Failed to create conversation', error)
    throw error
  }

  return data.id
}

export async function getConversationsForUser(userId: string) {
  // Try using the RPC function first
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_user_conversations', { current_user_id: userId })

  if (!rpcError && rpcData) {
    return (rpcData as any[]).map((row: any) => ({
      id: row.id as string,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      participant: row.participant_profile as ConversationParticipant['profiles'],
      last_message: row.last_message as DirectMessage | null,
      unread_count: Number(row.unread_count) || 0,
    } satisfies ConversationWithParticipant))
  }

  // Fallback to manual query
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      created_at,
      updated_at,
      participant_1_id,
      participant_2_id,
      last_message:direct_messages!direct_messages_conversation_id_fkey (
        id,
        sender_id,
        content,
        created_at,
        is_read
      ),
      conversation_participants!conversation_id (
        user_id,
        last_read_at,
        profiles:profiles (
          id,
          username,
          display_name,
          avatar_url
        )
      )
    `)
    .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[NebulaX] Failed to fetch conversations', error)
    return []
  }

  return data
    .map((conv: any) => {
      const otherParticipant = conv.conversation_participants?.find(
        (cp: any) => cp.user_id !== userId
      )

      if (!otherParticipant) return null

      const lastMessage = Array.isArray(conv.last_message)
        ? conv.last_message[0]
        : conv.last_message

      const unreadCount = lastMessage &&
        lastMessage.sender_id !== userId &&
        !lastMessage.is_read
        ? 1
        : 0

      return {
        id: conv.id as string,
        created_at: conv.created_at as string,
        updated_at: conv.updated_at as string,
        participant: otherParticipant.profiles as ConversationParticipant['profiles'],
        last_message: lastMessage as DirectMessage | null,
        unread_count: unreadCount,
      } satisfies ConversationWithParticipant
    })
    .filter((conv): conv is ConversationWithParticipant => conv !== null)
}

export async function getMessagesForConversation(conversationId: string, limit = 50) {
  const { data, error } = await supabase
    .from('direct_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[NebulaX] Failed to fetch messages', error)
    return []
  }

  return data as DirectMessage[]
}

export async function sendMessage(conversationId: string, senderId: string, content: string) {
  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
    })
    .select()
    .single()

  if (error) {
    console.error('[NebulaX] Failed to send message', error)
    throw error
  }

  // Update conversation updated_at
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  return data as DirectMessage
}

export async function markMessagesAsRead(conversationId: string, userId: string) {
  const { error } = await supabase
    .from('direct_messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('sender_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('[NebulaX] Failed to mark messages as read', error)
    throw error
  }

  // Update participant last_read_at
  await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
}

export async function subscribeToNewMessages(
  conversationId: string,
  callback: (message: DirectMessage) => void
): Promise<() => void> {
  const channel = supabase
    .channel(`direct_messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        callback(payload.new as DirectMessage)
      }
    )
    .subscribe()

  return async () => {
    await supabase.removeChannel(channel)
  }
}

export async function subscribeToConversations(
  userId: string,
  callback: () => void
): Promise<() => void> {
  const channel = supabase
    .channel(`conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `participant_1_id=eq.${userId}`,
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `participant_2_id=eq.${userId}`,
      },
      callback
    )
    .subscribe()

  return async () => {
    await supabase.removeChannel(channel)
  }
}
