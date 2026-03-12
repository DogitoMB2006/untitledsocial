import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Home, MessageSquare, Settings, PlusSquare, LogOut, Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getProfileByUserId, type Profile } from '../../lib/profile'
import { useNotifications } from '../../context/NotificationsContext'
import { getNotificationHref, type AppNotification } from '../../lib/notifications'
import Button from '../ui/Button'
import CreatePostModal from '../post/CreatePostModal'
import NotificationsInboxModal from '../notifications/NotificationsInboxModal'

const Navbar = () => {
  const { user, signOut } = useAuth()
  const {
    browserPermission,
    isLoading: isLoadingNotifications,
    markAllAsRead,
    markAsRead,
    notifications,
    openPermissionPrompt,
    unreadCount,
  } = useNotifications()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [isInboxOpen, setIsInboxOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true
    if (!user) {
      setProfile(null)
      return
    }

    void (async () => {
      const data = await getProfileByUserId(user.id)
      if (isMounted) {
        setProfile(data)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [user])

  const initials =
    profile?.display_name?.[0] ??
    profile?.username?.[0] ??
    user?.email?.[0] ??
    'U'

  const handleProfileClick = () => {
    if (profile?.username) {
      navigate(`/u/${profile.username}`)
    } else {
      navigate('/settings/profile')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  const handleNotificationClick = async (notification: AppNotification) => {
    if (user) {
      await markAsRead(notification.id)
    }

    setIsInboxOpen(false)
    await navigate(getNotificationHref(notification))
  }

  const NavItem = ({ to, icon: Icon, label, onClick, isActive }: { to?: string; icon: any; label: string; onClick?: () => void; isActive?: boolean }) => {
    const content = (
      <div className={`flex items-center gap-4 rounded-xl p-3 transition-all duration-300 w-full hover:bg-slate-800/60 ${isActive ? 'text-sky-400 font-semibold' : 'text-slate-300 hover:text-slate-50'}`}>
        <Icon className={`w-6 h-6 shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-sky-400' : ''}`} />
        <span className="hidden group-hover:inline-block opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300 delay-75">
          {label}
        </span>
      </div>
    )

    if (onClick) {
      return (
        <button type="button" onClick={onClick} className="w-full text-left outline-none cursor-pointer">
          {content}
        </button>
      )
    }

    return (
      <NavLink to={to!} className="w-full outline-none">
        {({ isActive: isCurrent }) => (
          <div className={`flex items-center gap-4 rounded-xl p-3 transition-all w-full hover:bg-slate-800/60 ${isCurrent ? 'text-sky-400 font-bold' : 'text-slate-300 hover:text-slate-50'}`}>
            <Icon className={`w-6 h-6 shrink-0 transition-transform group-hover:scale-105 ${isCurrent ? 'text-sky-400' : ''}`} />
            <span className="hidden group-hover:inline-block opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300 delay-75">
              {label}
            </span>
          </div>
        )}
      </NavLink>
    )
  }

  return (
    <>
      <aside className="group sticky top-0 left-0 z-50 flex h-screen w-20 flex-col items-center border-r border-slate-800/60 bg-slate-950/90 backdrop-blur-xl px-2 py-6 transition-all duration-300 hover:w-64 hover:items-start md:w-20 lg:w-20">
        
        {/* Logo / Profile - Top Location */}
        <div className="flex w-full flex-col items-center group-hover:items-start px-2 mb-10">
          {!user ? (
            <Link to="/" className="flex items-center gap-4 outline-none">
              <img src="/orbyt-logo.png" alt="Nebula" className="h-10 w-10 shrink-0 object-contain rounded-xl" />
              <span className="hidden group-hover:inline-block text-xl font-bold tracking-tight text-white transition-opacity duration-300 mt-2">
                Nebula
              </span>
            </Link>
          ) : (
            <button 
              type="button" 
              onClick={handleProfileClick}
              className="group/profile flex items-center gap-4 w-full cursor-pointer outline-none rounded-2xl p-2 transition-all hover:bg-slate-800/50"
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-800 transition-transform group-hover/profile:scale-105 shadow-md">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name ?? profile.username ?? 'Profile'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-sky-500 to-blue-600 text-sm font-semibold text-white">
                    {initials.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="hidden group-hover:flex flex-col text-left opacity-0 group-hover:opacity-100 transition-opacity duration-300 min-w-0 flex-1">
                <span className="text-sm font-bold text-slate-100 truncate">
                  {profile?.display_name || profile?.username || 'User'}
                </span>
                <span className="text-xs text-slate-400 truncate">
                  {profile?.username ? `@${profile.username}` : user.email}
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex w-full flex-1 flex-col gap-2 px-2 overflow-x-hidden">
          {!user ? (
            <div className="flex flex-col gap-4 mt-10">
              <NavLink to="/login" className="w-full">
                {({ isActive }) => (
                  <Button variant={isActive ? 'primary' : 'ghost'} className={`w-full ${isActive ? '' : 'group-hover:bg-slate-800'}`}>
                    <span className="group-hover:hidden">Log</span>
                    <span className="hidden group-hover:inline">Login</span>
                  </Button>
                )}
              </NavLink>
              <NavLink to="/register" className="w-full">
                {({ isActive }) => (
                  <Button variant={isActive ? 'primary' : 'outline'} className={`w-full border-sky-500/30 ${isActive ? '' : 'group-hover:bg-slate-800'}`}>
                    <span className="group-hover:hidden">Reg</span>
                    <span className="hidden group-hover:inline">Register</span>
                  </Button>
                )}
              </NavLink>
            </div>
          ) : (
            <>
              <NavItem to="/" icon={Home} label="Home" />
              <button
                type="button"
                onClick={() => setIsInboxOpen(true)}
                className="relative w-full text-left outline-none"
              >
                <div className="flex items-center gap-4 rounded-xl p-3 transition-all duration-300 w-full text-slate-300 hover:bg-slate-800/60 hover:text-slate-50">
                  <div className="relative shrink-0">
                    <Bell className="h-6 w-6 transition-transform group-hover:scale-105" />
                    {unreadCount > 0 ? (
                      <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-sky-500 px-1.5 text-[10px] font-semibold text-white shadow-lg shadow-sky-500/30">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    ) : null}
                  </div>
                  <span className="hidden group-hover:inline-block opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300 delay-75">
                    Inbox
                  </span>
                </div>
              </button>
              <NavItem to="/messages" icon={MessageSquare} label="Direct Messages" />
              <NavItem to="/settings/profile" icon={Settings} label="Settings" />

              <div className="mt-6 w-full px-1">
                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(true)}
                  className="flex w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-sky-500 to-blue-600 p-3 text-white shadow-lg shadow-sky-500/20 transition-all duration-300 hover:from-sky-400 hover:to-blue-500 hover:shadow-sky-500/40 group-hover:justify-start"
                >
                  <PlusSquare className="h-6 w-6 shrink-0" />
                  <span
                    className="max-w-0 overflow-hidden whitespace-nowrap pl-0 font-semibold opacity-0 transition-all duration-300 group-hover:max-w-24 group-hover:pl-1 group-hover:opacity-100"
                    aria-hidden="true"
                  >
                    Post
                  </span>
                </button>
              </div>
            </>
          )}
        </nav>

        {/* Bottom Actions */}
        {user && (
          <div className="w-full px-2 mt-auto pt-4 border-t border-slate-800/50">
            <NavItem icon={LogOut} label="Log out" onClick={handleSignOut} />
          </div>
        )}
      </aside>

      <CreatePostModal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} />
      <NotificationsInboxModal
        isOpen={isInboxOpen}
        notifications={notifications}
        unreadCount={unreadCount}
        isLoading={isLoadingNotifications}
        browserPermission={browserPermission}
        onEnableDesktop={openPermissionPrompt}
        onMarkAllRead={() => void markAllAsRead()}
        onNotificationClick={(notification) => void handleNotificationClick(notification)}
        onClose={() => setIsInboxOpen(false)}
      />
    </>
  )
}

export default Navbar


