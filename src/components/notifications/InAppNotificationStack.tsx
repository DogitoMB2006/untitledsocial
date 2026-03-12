import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationsContext'
import {
  formatNotificationTime,
  getNotificationBody,
  getNotificationHref,
  getNotificationMessage,
} from '../../lib/notifications'

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

const InAppNotificationStack = () => {
  const navigate = useNavigate()
  const { dismissLiveToast, liveToasts, markAsRead } = useNotifications()

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[NebulaX][Notifications] In-app toast stack updated', {
      count: liveToasts.length,
      ids: liveToasts.map((notification) => notification.id),
    })
    // #region agent log
    debugNotificationLog('H4', 'InAppNotificationStack.tsx:effect', 'In-app notification stack observed current toast state', { count: liveToasts.length, ids: liveToasts.map((notification) => notification.id) })
    // #endregion
  }, [liveToasts])

  if (liveToasts.length === 0) {
    return null
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[20000] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      {liveToasts.map((notification) => {
        const actorName =
          notification.actor?.display_name ?? notification.actor?.username ?? 'Someone'
        const initials = (actorName[0] ?? 'U').toUpperCase()

        return (
          <div
            key={notification.id}
            className="pointer-events-auto rounded-2xl border border-sky-500/25 bg-slate-950/95 shadow-xl shadow-black/40 backdrop-blur-md"
          >
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  await markAsRead(notification.id)
                  dismissLiveToast(notification.id)
                  await navigate(getNotificationHref(notification))
                })()
              }}
              className="flex w-full items-start gap-3 px-4 py-3 text-left"
            >
              <div className="mt-0.5 h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-900">
                {notification.actor?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={notification.actor.avatar_url}
                    alt={actorName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500/30 to-slate-900 text-sm font-semibold text-slate-100">
                    {initials}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-50">
                    {getNotificationMessage(notification)}
                  </p>
                  <span className="shrink-0 text-[11px] text-slate-500">
                    {formatNotificationTime(notification.created_at)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-300">
                  {getNotificationBody(notification)}
                </p>
              </div>
            </button>
            <div className="h-1 w-full overflow-hidden rounded-b-2xl bg-slate-800/70">
              <div className="h-full w-full animate-[toastShrink_5s_linear_forwards] bg-gradient-to-r from-sky-400 via-blue-500 to-sky-300" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default InAppNotificationStack
