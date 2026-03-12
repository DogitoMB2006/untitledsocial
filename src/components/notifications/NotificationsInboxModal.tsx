import { createPortal } from 'react-dom'
import {
  formatNotificationTime,
  getNotificationBody,
  getNotificationMessage,
} from '../../context/NotificationsContext'
import type { AppNotification } from '../../lib/notifications'
import Button from '../ui/Button'

interface NotificationsInboxModalProps {
  isOpen: boolean
  notifications: AppNotification[]
  unreadCount: number
  isLoading: boolean
  browserPermission: NotificationPermission | 'unsupported'
  onEnableDesktop: () => void
  onMarkAllRead: () => void
  onNotificationClick: (notification: AppNotification) => void
  onClose: () => void
}

const NotificationsInboxModal = ({
  isOpen,
  notifications,
  unreadCount,
  isLoading,
  browserPermission,
  onEnableDesktop,
  onMarkAllRead,
  onNotificationClick,
  onClose,
}: NotificationsInboxModalProps) => {
  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1050] flex items-start justify-center bg-black/80 px-4 pt-20 pb-8 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/60"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-800 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-50">Inbox</h2>
              <p className="text-xs text-slate-400">
                Live follows, comments, replies, and likes.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-700/80 bg-slate-900/90 px-3 py-1 text-[11px] text-slate-200 transition-colors hover:border-sky-500/50 hover:text-sky-200"
            >
              Close
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {browserPermission !== 'granted' && browserPermission !== 'unsupported' ? (
              <Button size="sm" variant="outline" onClick={onEnableDesktop}>
                Enable desktop alerts
              </Button>
            ) : null}
            {unreadCount > 0 ? (
              <Button size="sm" variant="ghost" onClick={onMarkAllRead}>
                Mark all read
              </Button>
            ) : null}
          </div>
        </div>

        <div className="max-h-[32rem] overflow-y-auto p-5">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 rounded-2xl border border-slate-800 bg-slate-900/60"
                />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-6 text-center">
              <p className="text-sm text-slate-300">No notifications yet.</p>
              <p className="mt-1 text-xs text-slate-500">
                New activity will show up here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const actorName =
                  notification.actor?.display_name ?? notification.actor?.username ?? 'Someone'
                const initials = (actorName[0] ?? 'U').toUpperCase()

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => onNotificationClick(notification)}
                    className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                      notification.read_at
                        ? 'border-slate-800 bg-slate-900/50 hover:border-sky-500/30 hover:bg-slate-900'
                        : 'border-sky-500/30 bg-sky-500/10 hover:border-sky-400/50 hover:bg-sky-500/15'
                    }`}
                  >
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-900">
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
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default NotificationsInboxModal
