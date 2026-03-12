import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import {
  fetchNotifications,
  formatNotificationTime,
  getNotificationActorName,
  getNotificationBody,
  getNotificationById,
  getNotificationHref,
  getNotificationMessage,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  type AppNotification,
} from '../lib/notifications'

type BrowserPermissionState = NotificationPermission | 'unsupported'

interface NotificationsContextValue {
  notifications: AppNotification[]
  liveToasts: AppNotification[]
  unreadCount: number
  isLoading: boolean
  browserPermission: BrowserPermissionState
  isPermissionPromptOpen: boolean
  isRequestingPermission: boolean
  openPermissionPrompt: () => void
  dismissPermissionPrompt: () => void
  requestBrowserPermission: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  dismissLiveToast: (notificationId: string) => void
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined)

// #region agent log
function debugNotificationLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  fetch('http://127.0.0.1:7936/ingest/72898206-1110-4bbd-a48b-5fe83e56b31e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'edfc10'},body:JSON.stringify({sessionId:'edfc10',runId:'pre-fix',hypothesisId,location,message,data,timestamp:Date.now()})}).catch((error)=>{console.warn('[NebulaX][DebugLog] Failed to write debug log', { hypothesisId, location, error })})
}
// #endregion

function getPromptDismissedKey(userId: string) {
  return `nebulax.notifications.prompt.dismissed:${userId}`
}

function getBrowserPermission(): BrowserPermissionState {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported'
  }

  return Notification.permission
}

function canUseNativeNotifications() {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return false
  }

  return window.isSecureContext
}

async function showNativeNotification(
  title: string,
  options?: NotificationOptions,
  onClick?: () => void,
) {
  if (!canUseNativeNotifications() || Notification.permission !== 'granted') {
    return null
  }

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, options)
      return null
    }

    const notification = new Notification(title, options)
    if (onClick) {
      notification.onclick = () => {
        onClick()
        notification.close()
      }
    }

    return notification
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[NebulaX] Failed to show desktop notification', error)
    return null
  }
}

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [liveToasts, setLiveToasts] = useState<AppNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [browserPermission, setBrowserPermission] = useState<BrowserPermissionState>(
    getBrowserPermission(),
  )
  const [isPermissionPromptOpen, setIsPermissionPromptOpen] = useState(false)
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const seenNotificationIdsRef = useRef<Set<string>>(new Set())
  const toastTimeoutsRef = useRef<Map<string, number>>(new Map())
  const hasCompletedInitialBootstrapRef = useRef(false)

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications],
  )

  const enqueueLiveNotification = async (
    notification: AppNotification,
    activeUserId: string,
    source: 'realtime' | 'bootstrap',
  ) => {
    // eslint-disable-next-line no-console
    console.log('[NebulaX][Notifications] Live notification received', {
      source,
      notificationId: notification.id,
      type: notification.type,
      href: getNotificationHref(notification),
      browserPermission,
    })

    seenNotificationIdsRef.current.add(notification.id)
    setLiveToasts((current) => [
      notification,
      ...current.filter((item) => item.id !== notification.id),
    ])

    // eslint-disable-next-line no-console
    console.log('[NebulaX][Notifications] Added notification to live toast stack', {
      source,
      notificationId: notification.id,
    })

    const existingTimeout = toastTimeoutsRef.current.get(notification.id)
    if (existingTimeout) {
      window.clearTimeout(existingTimeout)
    }

    const timeoutId = window.setTimeout(() => {
      setLiveToasts((current) =>
        current.filter((item) => item.id !== notification.id),
      )
      toastTimeoutsRef.current.delete(notification.id)

      // eslint-disable-next-line no-console
      console.log('[NebulaX][Notifications] Auto-dismissed live toast', {
        notificationId: notification.id,
      })
    }, 5000)
    toastTimeoutsRef.current.set(notification.id, timeoutId)

    if (browserPermission === 'granted') {
      await showNativeNotification(
        getNotificationMessage(notification),
        {
          body: getNotificationBody(notification),
          icon: notification.actor?.avatar_url ?? '/orbyt-logo.png',
          tag: notification.id,
          data: {
            url: `${window.location.origin}${getNotificationHref(notification)}`,
          },
        },
        () => {
          window.focus()
          void markAsReadInternal(notification.id, activeUserId)
          window.location.assign(getNotificationHref(notification))
        },
      )
    }
  }

  useEffect(() => {
    // #region agent log
    debugNotificationLog('H5', 'NotificationsContext.tsx:mount', 'Notifications provider mounted', {
      hasWindow: typeof window !== 'undefined',
      hasNotificationApi: typeof Notification !== 'undefined',
      secureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
    })
    // #endregion
    // eslint-disable-next-line no-console
    console.log('[NebulaX][Notifications] Provider mounted', {
      hasWindow: typeof window !== 'undefined',
      hasNotificationApi: typeof Notification !== 'undefined',
      secureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
    })
  }, [])

  useEffect(() => {
    const refreshPermission = () => setBrowserPermission(getBrowserPermission())

    refreshPermission()
    if (typeof window === 'undefined') return undefined

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const payload = event.data as { type?: string; url?: string } | undefined
      if (payload?.type === 'notification-click' && payload.url) {
        window.location.assign(payload.url)
      }
    }

    window.addEventListener('focus', refreshPermission)
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage)
    return () => {
      window.removeEventListener('focus', refreshPermission)
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage)
    }
  }, [])

  useEffect(() => {
    if (isAuthLoading) return

    if (!user) {
      // #region agent log
      debugNotificationLog('H3', 'NotificationsContext.tsx:user-reset', 'Notification state reset due to missing user', {})
      // #endregion
      setNotifications([])
      setLiveToasts([])
      setIsPermissionPromptOpen(false)
      seenNotificationIdsRef.current = new Set()
      hasCompletedInitialBootstrapRef.current = false
      toastTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
      toastTimeoutsRef.current.clear()
      return
    }

    const dismissed =
      typeof window !== 'undefined' &&
      window.localStorage.getItem(getPromptDismissedKey(user.id)) === 'true'

    setIsPermissionPromptOpen(browserPermission !== 'granted' && browserPermission !== 'unsupported' && !dismissed)
  }, [browserPermission, isAuthLoading, user])

  useEffect(() => {
    if (!user) return undefined

    let isMounted = true
    setIsLoading(true)

    // eslint-disable-next-line no-console
    console.log('[NebulaX][Notifications] Starting notification bootstrap/subscription', {
      userId: user.id,
      browserPermission,
      visibilityState: typeof document !== 'undefined' ? document.visibilityState : 'unknown',
    })

    void (async () => {
      try {
        const data = await fetchNotifications(user.id)
        if (!isMounted) return
        const unseenNotifications = hasCompletedInitialBootstrapRef.current
          ? data.filter((notification) => !seenNotificationIdsRef.current.has(notification.id))
          : []
        // #region agent log
        debugNotificationLog('H2', 'NotificationsContext.tsx:bootstrap-fetch', 'Bootstrapped notifications for active user', { userId: user.id, count: data.length, ids: data.map((notification) => notification.id) })
        // #endregion
        // eslint-disable-next-line no-console
        console.log('[NebulaX][Notifications] Bootstrapped notifications', {
          userId: user.id,
          count: data.length,
          ids: data.map((notification) => notification.id),
        })
        setNotifications(data)
        const nextSeenIds = new Set([
          ...seenNotificationIdsRef.current,
          ...data.map((notification) => notification.id),
        ])
        seenNotificationIdsRef.current = nextSeenIds
        if (unseenNotifications.length > 0) {
          // #region agent log
          debugNotificationLog('H9', 'NotificationsContext.tsx:bootstrap-unseen', 'Bootstrap fetch discovered unseen notifications', {
            userId: user.id,
            count: unseenNotifications.length,
            ids: unseenNotifications.map((notification) => notification.id),
          })
          // #endregion
          // eslint-disable-next-line no-console
          console.log('[NebulaX][Notifications] Bootstrap discovered unseen notifications', {
            userId: user.id,
            count: unseenNotifications.length,
            ids: unseenNotifications.map((notification) => notification.id),
          })
          await Promise.all(
            unseenNotifications.map((notification) =>
              enqueueLiveNotification(notification, user.id, 'bootstrap'),
            ),
          )
        }
        hasCompletedInitialBootstrapRef.current = true
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[NebulaX] Failed to bootstrap notifications', error)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    })()

    const channel = subscribeToNotifications(user.id, {
      onInsert: async (notificationId) => {
        // #region agent log
        debugNotificationLog('H1', 'NotificationsContext.tsx:onInsert:start', 'Realtime insert callback fired', { userId: user.id, notificationId, seenAlready: seenNotificationIdsRef.current.has(notificationId) })
        // #endregion
        if (seenNotificationIdsRef.current.has(notificationId)) return

        try {
          const notification = await getNotificationById(notificationId, user.id)
          // #region agent log
          debugNotificationLog('H2', 'NotificationsContext.tsx:onInsert:fetched', 'Fetched notification during realtime insert handling', { notificationId: notification.id, type: notification.type, isMounted, seenAfterFetch: seenNotificationIdsRef.current.has(notification.id) })
          // #endregion
          if (!isMounted || seenNotificationIdsRef.current.has(notification.id)) return

          // eslint-disable-next-line no-console
          console.log('[NebulaX][Notifications] Live notification received', {
            notificationId,
            type: notification.type,
            href: getNotificationHref(notification),
            browserPermission,
          })

          seenNotificationIdsRef.current.add(notification.id)
          setNotifications((current) => [
            notification,
            ...current.filter((item) => item.id !== notification.id),
          ])
          await enqueueLiveNotification(notification, user.id, 'realtime')
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('[NebulaX] Failed to process notification insert', error)
        }
      },
      onUpdate: async (notificationId) => {
        try {
          const updated = await getNotificationById(notificationId, user.id)
          if (!isMounted) return

          seenNotificationIdsRef.current.add(updated.id)
          setNotifications((current) =>
            current.map((notification) =>
              notification.id === updated.id ? updated : notification,
            ),
          )
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('[NebulaX] Failed to process notification update', error)
        }
      },
      onStatus: (status) => {
        // #region agent log
        debugNotificationLog('H6', 'NotificationsContext.tsx:subscribe:status', 'Realtime channel status changed', {
          userId: user.id,
          status,
        })
        // #endregion
        // eslint-disable-next-line no-console
        console.log('[NebulaX][Notifications] Realtime channel status', {
          userId: user.id,
          status,
        })
      },
    })

    return () => {
      isMounted = false
      toastTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
      toastTimeoutsRef.current.clear()
      void unsubscribeFromNotifications(channel)
    }
  }, [browserPermission, user])

  const dismissLiveToast = (notificationId: string) => {
    const timeoutId = toastTimeoutsRef.current.get(notificationId)
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      toastTimeoutsRef.current.delete(notificationId)
    }

    // eslint-disable-next-line no-console
    console.log('[NebulaX][Notifications] Manually dismissed live toast', {
      notificationId,
    })

    setLiveToasts((current) => current.filter((notification) => notification.id !== notificationId))
  }

  useEffect(() => {
    // #region agent log
    debugNotificationLog('H3', 'NotificationsContext.tsx:liveToasts-effect', 'Live toast state changed', { count: liveToasts.length, ids: liveToasts.map((notification) => notification.id) })
    // #endregion
  }, [liveToasts])

  const dismissPermissionPrompt = () => {
    if (user && typeof window !== 'undefined') {
      window.localStorage.setItem(getPromptDismissedKey(user.id), 'true')
    }
    setIsPermissionPromptOpen(false)
  }

  const openPermissionPrompt = () => {
    if (browserPermission === 'granted' || browserPermission === 'unsupported') return
    setIsPermissionPromptOpen(true)
  }

  const requestBrowserPermission = async () => {
    if (typeof Notification === 'undefined') {
      setBrowserPermission('unsupported')
      setIsPermissionPromptOpen(false)
      return
    }

    setIsRequestingPermission(true)
    try {
      const permission = await Notification.requestPermission()
      setBrowserPermission(permission)
      if (permission === 'granted') {
        if (user && typeof window !== 'undefined') {
          window.localStorage.removeItem(getPromptDismissedKey(user.id))
        }
        await showNativeNotification(
          'Desktop notifications enabled',
          {
            body: 'You will now get alerts for follows, comments, replies, and likes.',
            icon: '/orbyt-logo.png',
            tag: 'notifications-enabled',
            data: {
              url: window.location.origin,
            },
          },
          () => {
            window.focus()
          },
        )
        setIsPermissionPromptOpen(false)
      }
    } finally {
      setIsRequestingPermission(false)
    }
  }

  const markAsReadInternal = async (notificationId: string, userId: string) => {
    const current = notifications.find((notification) => notification.id === notificationId)
    if (current?.read_at) return

    setNotifications((existing) =>
      existing.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read_at: new Date().toISOString() }
          : notification,
      ),
    )

    try {
      const updated = await markNotificationRead(notificationId, userId)
      setNotifications((existing) =>
        existing.map((notification) =>
          notification.id === updated.id ? updated : notification,
        ),
      )
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[NebulaX] Failed to mark notification as read', error)
      setNotifications((existing) =>
        existing.map((notification) =>
          notification.id === notificationId ? { ...notification, read_at: current?.read_at ?? null } : notification,
        ),
      )
    }
  }

  const markAsRead = async (notificationId: string) => {
    if (!user) return
    await markAsReadInternal(notificationId, user.id)
  }

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return

    const readAt = new Date().toISOString()
    const previous = notifications
    setNotifications((existing) =>
      existing.map((notification) => ({ ...notification, read_at: notification.read_at ?? readAt })),
    )

    try {
      await markAllNotificationsRead(user.id)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[NebulaX] Failed to mark all notifications as read', error)
      setNotifications(previous)
    }
  }

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        liveToasts,
        unreadCount,
        isLoading,
        browserPermission,
        isPermissionPromptOpen,
        isRequestingPermission,
        openPermissionPrompt,
        dismissPermissionPrompt,
        requestBrowserPermission,
        markAsRead,
        markAllAsRead,
        dismissLiveToast,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }

  return context
}

export { formatNotificationTime, getNotificationBody, getNotificationMessage }
