import { createPortal } from 'react-dom'
import Button from '../ui/Button'

interface NotificationPermissionModalProps {
  isOpen: boolean
  browserPermission: NotificationPermission | 'unsupported'
  isRequesting: boolean
  onEnable: () => void
  onClose: () => void
}

const NotificationPermissionModal = ({
  isOpen,
  browserPermission,
  isRequesting,
  onEnable,
  onClose,
}: NotificationPermissionModalProps) => {
  if (!isOpen) return null

  const isDenied = browserPermission === 'denied'
  const isUnsupported = browserPermission === 'unsupported'

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/60"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-4 p-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-300">
              Desktop Notifications
            </p>
            <h2 className="text-xl font-semibold text-slate-50">
              Stay on top of new activity
            </h2>
            <p className="text-sm text-slate-300">
              Get notified when someone follows you, comments on your post, replies to your
              comment, or likes your post.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
            {isUnsupported ? (
              <p>Your browser or site context does not support desktop notifications here. Inbox and toast alerts will still work.</p>
            ) : isDenied ? (
              <p>
                Desktop notifications are blocked right now. You can re-enable them in your browser site settings, and make sure your OS allows notifications for this browser.
              </p>
            ) : (
              <p>
                Click enable and your browser will ask for permission. A test notification will appear right after it is enabled.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={isRequesting}>
            Not now
          </Button>
          {!isUnsupported ? (
            <Button onClick={onEnable} disabled={isRequesting}>
              {isRequesting ? 'Enabling...' : isDenied ? 'Try again' : 'Enable notifications'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default NotificationPermissionModal
