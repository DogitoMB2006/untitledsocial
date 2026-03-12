import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import InAppNotificationStack from '../notifications/InAppNotificationStack'
import NotificationPermissionModal from '../notifications/NotificationPermissionModal'
import { useNotifications } from '../../context/NotificationsContext'

const AppLayout = () => {
  const {
    browserPermission,
    dismissPermissionPrompt,
    isPermissionPromptOpen,
    isRequestingPermission,
    requestBrowserPermission,
  } = useNotifications()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
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

