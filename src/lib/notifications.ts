import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

export type NotificationType = 'follow' | 'comment' | 'reply' | 'post_like'

// #region agent log
function debugNotificationLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  fetch('http://127.0.0.1:7936/ingest/72898206-1110-4bbd-a48b-5fe83e56b31e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'edfc10'},body:JSON.stringify({sessionId:'edfc10',runId:'pre-fix',hypothesisId,location,message,data,timestamp:Date.now()})}).catch(()=>{})
}
// #endregion

export interface NotificationActor {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

export interface AppNotification {
  id: string
  recipient_id: string
  actor_id: string
  type: NotificationType
  post_id: string | null
  comment_id: string | null
  created_at: string
  read_at: string | null
  data: Record<string, unknown>
  actor?: NotificationActor
}

const notificationSelect =
  'id, recipient_id, actor_id, type, post_id, comment_id, created_at, read_at, data, actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_url)'

function mapNotification(row: any): AppNotification {
  const actors = Array.isArray(row.actor)
    ? row.actor
    : row.actor
      ? [row.actor]
      : []
  const actor = actors[0]

  return {
    id: row.id as string,
    recipient_id: row.recipient_id as string,
    actor_id: row.actor_id as string,
    type: row.type as NotificationType,
    post_id: (row.post_id ?? null) as string | null,
    comment_id: (row.comment_id ?? null) as string | null,
    created_at: row.created_at as string,
    read_at: (row.read_at ?? null) as string | null,
    data: ((row.data ?? {}) as Record<string, unknown>) ?? {},
    actor: actor
      ? {
          id: actor.id as string,
          username: actor.username as string,
          display_name: (actor.display_name ?? null) as string | null,
          avatar_url: (actor.avatar_url ?? null) as string | null,
        }
      : undefined,
  }
}

export function getNotificationActorName(notification: AppNotification) {
  return notification.actor?.display_name ?? notification.actor?.username ?? 'Someone'
}

export function getNotificationMessage(notification: AppNotification) {
  const actorName = getNotificationActorName(notification)

  switch (notification.type) {
    case 'follow':
      return `${actorName} followed you`
    case 'comment':
      return `${actorName} commented on your post`
    case 'reply':
      return `${actorName} replied to your comment`
    case 'post_like':
      return `${actorName} liked your post`
    default:
      return `${actorName} sent you a notification`
  }
}

export function getNotificationBody(notification: AppNotification) {
  const preview = notification.data.content_preview
  if (typeof preview === 'string' && preview.trim()) {
    return preview
  }

  switch (notification.type) {
    case 'follow':
      return 'Open their profile to learn more.'
    case 'comment':
    case 'reply':
      return 'Open the post to join the conversation.'
    case 'post_like':
      return 'Open the post to see the latest activity.'
    default:
      return 'Open the app to see more.'
  }
}

export function getNotificationHref(notification: AppNotification) {
  if (notification.type === 'follow' && notification.actor?.username) {
    return `/u/${notification.actor.username}`
  }

  if (notification.post_id) {
    const params = new URLSearchParams({ post: notification.post_id })
    return `/?${params.toString()}`
  }

  if (notification.actor?.username) {
    return `/u/${notification.actor.username}`
  }

  return '/'
}

export function formatNotificationTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Just now'
  }

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}

export async function fetchNotifications(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('notifications')
    .select(notificationSelect)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to fetch notifications', error)
    throw error
  }

  return (data ?? []).map(mapNotification)
}

export async function getNotificationById(notificationId: string, userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select(notificationSelect)
    .eq('id', notificationId)
    .eq('recipient_id', userId)
    .single()

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to fetch notification by id', error)
    throw error
  }

  return mapNotification(data)
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .eq('recipient_id', userId)
    .select(notificationSelect)
    .single()

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to mark notification as read', error)
    throw error
  }

  return mapNotification(data)
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({
      read_at: new Date().toISOString(),
    })
    .eq('recipient_id', userId)
    .is('read_at', null)

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to mark all notifications as read', error)
    throw error
  }
}

export function subscribeToNotifications(
  userId: string,
  handlers: {
    onInsert?: (notificationId: string) => void | Promise<void>
    onUpdate?: (notificationId: string) => void | Promise<void>
    onStatus?: (status: string) => void
  },
) {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        // #region agent log
        debugNotificationLog('H7', 'notifications.ts:subscribe:insert-raw', 'Raw realtime INSERT payload received', {
          userId,
          newId: typeof payload.new?.id === 'string' ? payload.new.id : null,
          eventType: payload.eventType,
          schema: payload.schema,
          table: payload.table,
        })
        // #endregion
        // eslint-disable-next-line no-console
        console.log('[NebulaX][Notifications] Raw INSERT payload', {
          userId,
          newId: payload.new?.id,
          eventType: payload.eventType,
          schema: payload.schema,
          table: payload.table,
        })
        const id = payload.new.id
        if (typeof id === 'string') {
          void handlers.onInsert?.(id)
        }
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        // #region agent log
        debugNotificationLog('H8', 'notifications.ts:subscribe:update-raw', 'Raw realtime UPDATE payload received', {
          userId,
          newId: typeof payload.new?.id === 'string' ? payload.new.id : null,
          eventType: payload.eventType,
          schema: payload.schema,
          table: payload.table,
        })
        // #endregion
        // eslint-disable-next-line no-console
        console.log('[NebulaX][Notifications] Raw UPDATE payload', {
          userId,
          newId: payload.new?.id,
          eventType: payload.eventType,
          schema: payload.schema,
          table: payload.table,
        })
        const id = payload.new.id
        if (typeof id === 'string') {
          void handlers.onUpdate?.(id)
        }
      },
    )
    .subscribe((status, error) => {
      if (error) {
        // #region agent log
        debugNotificationLog('H6', 'notifications.ts:subscribe:error', 'Realtime subscription callback returned an error', {
          userId,
          status,
          message: error.message,
        })
        // #endregion
        // eslint-disable-next-line no-console
        console.error('[NebulaX][Notifications] Realtime subscription error', {
          userId,
          status,
          message: error.message,
        })
      }
      handlers.onStatus?.(status)
    })
}

export async function unsubscribeFromNotifications(channel: RealtimeChannel) {
  await supabase.removeChannel(channel)
}
