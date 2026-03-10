import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import Button from '../ui/Button'
import { useAuth } from '../../context/AuthContext'
import { getProfileByUserId, type Profile } from '../../lib/profile'

const Navbar = () => {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
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
      setIsMenuOpen(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setIsMenuOpen(false)
    navigate('/', { replace: true })
  }

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur relative z-50">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2">
          <img
            src="/orbyt-logo.png"
            alt="Orbyt"
            className="h-10 w-auto object-contain"
          />
        </Link>
        {!user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <NavLink to="/login">
              {({ isActive }) => (
                <Button
                  variant={isActive ? 'primary' : 'ghost'}
                  size="sm"
                >
                  Login
                </Button>
              )}
            </NavLink>
            <NavLink to="/register">
              {({ isActive }) => (
                <Button
                  variant={isActive ? 'primary' : 'outline'}
                  size="sm"
                >
                  Register
                </Button>
              )}
            </NavLink>
          </div>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 px-2 py-1 hover:bg-slate-800/80 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-xs font-semibold text-slate-100">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name ?? profile.username ?? 'Profile'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials.toUpperCase()
                )}
              </div>
              <span className="hidden sm:inline text-xs text-slate-200">
                {profile?.username ? `@${profile.username}` : user.email}
              </span>
            </button>
            {isMenuOpen ? (
              <div className="absolute right-0 mt-2 w-40 rounded-xl border border-slate-800 bg-slate-950/95 shadow-xl shadow-black/40 py-1 text-xs text-slate-200 z-50">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-slate-800/80"
                  onClick={handleProfileClick}
                >
                  Profile
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-slate-800/80"
                  onClick={handleSignOut}
                >
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        )}
      </nav>
    </header>
  )
}

export default Navbar

