import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import ProfileEditModal from '../../components/profile/ProfileEditModal'
import { useAuth } from '../../context/AuthContext'
import { getProfileByUserId, type Profile } from '../../lib/profile'

const ProfileSettingsPage = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    setIsLoading(true)
    setError(null)

    void (async () => {
      try {
        const data = await getProfileByUserId(user.id)
        if (!data) {
          setError('Profile not found. Try refreshing in a moment.')
          return
        }
        setProfile(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings.')
      } finally {
        setIsLoading(false)
      }
    })()
  }, [user])

  if (isLoading) {
    return (
      <Card className="p-6 text-sm text-slate-400 text-center">
        Loading your profile settings…
      </Card>
    )
  }

  if (error || !profile) {
    return (
      <Card className="p-6 space-y-3 text-center">
        <p className="text-sm text-red-300">{error ?? 'Unable to load profile settings.'}</p>
        <Link to="/">
          <Button variant="outline" size="sm">Back to home</Button>
        </Link>
      </Card>
    )
  }

  const displayName = profile.display_name || profile.username
  const initials = (displayName[0] ?? 'U').toUpperCase()

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="relative h-40 bg-gradient-to-br from-sky-600/30 via-blue-500/20 to-slate-950">
          {profile.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.banner_url}
              alt={`${displayName} banner`}
              className="h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
        </div>
        <div className="relative px-5 pb-5">
          <div className="-mt-12 mb-3 h-24 w-24 overflow-hidden rounded-full border-4 border-slate-950 bg-slate-900">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-100">
                {initials}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xl font-semibold text-slate-50">{displayName}</p>
            <p className="text-sm text-slate-400">@{profile.username}</p>
            <p className="text-sm text-slate-300">
              {profile.bio?.trim() || 'No bio yet. Add one from Edit profile.'}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setIsEditOpen(true)}>
              Open Edit Modal
            </Button>
            <Link to={`/u/${profile.username}`}>
              <Button size="sm" variant="outline">
                View Public Profile
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <ProfileEditModal
        isOpen={isEditOpen}
        profile={profile}
        onClose={() => setIsEditOpen(false)}
        onSaved={(updated) => setProfile(updated)}
      />
    </div>
  )
}

export default ProfileSettingsPage
