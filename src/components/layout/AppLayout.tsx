import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import InAppNotificationStack from '../notifications/InAppNotificationStack'
import NotificationPermissionModal from '../notifications/NotificationPermissionModal'
import { useNotifications } from '../../context/NotificationsContext'
import { useTheme } from '../../context/ThemeContext'
import clsx from 'clsx'

const AppLayout = () => {
  const { theme } = useTheme()
  const {
    browserPermission,
    dismissPermissionPrompt,
    isPermissionPromptOpen,
    isRequestingPermission,
    requestBrowserPermission,
  } = useNotifications()

  const isDark = theme === 'dark'

  return (
    <div className={clsx('min-h-screen flex', isDark ? 'bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900')}>
      {/* Side Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
          <Outlet />
        </div>
        <Footer />
      </main>
      <NotificationPermissionModal
        isOpen={isPermissionPromptOpen}
        browserPermission={browserPermission}
        isRequesting={isRequestingPermission}
        onEnable={() => void requestBrowserPermission()}
        onClose={dismissPermissionPrompt}
      />
      <InAppNotificationStack />
    </div>
  )
}

export default AppLayout

