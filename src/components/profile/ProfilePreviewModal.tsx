import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  followUser,
  type ProfileWithStats,
  unfollowUser,
} from '../../lib/profile'
import Button from '../ui/Button'

interface ProfilePreviewModalProps {
  isOpen: boolean
  isLoading: boolean
  profile: ProfileWithStats | null
  fallbackName: string
  fallbackHandle?: string
  onClose: () => void
  onProfileUpdated?: (profile: ProfileWithStats) => void
}

const formatJoinDate = (value?: string) => {
  if (!value) return 'Joined recently'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Joined recently'
  }

  return `Joined ${date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })}`
}

const ProfilePreviewModal = ({
  isOpen,
  isLoading,
  profile,
  fallbackName,
  fallbackHandle,
  onClose,
  onProfileUpdated,
}: ProfilePreviewModalProps) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [localProfile, setLocalProfile] = useState<ProfileWithStats | null>(profile)
  const [isUpdatingFollowState, setIsUpdatingFollowState] = useState(false)
  const [followError, setFollowError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    setLocalProfile(profile)
    setFollowError(null)
  }, [profile, isOpen])

  if (!isOpen) return null

  const activeProfile = localProfile ?? profile
  const displayName = activeProfile?.display_name ?? fallbackName
  const username = activeProfile?.username
    ? `@${activeProfile.username}`
    : fallbackHandle
      ? `@${fallbackHandle}`
      : '@nebula-user'
  const bio = activeProfile?.bio?.trim() || 'No bio yet.'
  const initials = (displayName[0] ?? 'U').toUpperCase()
  const publicUsername = activeProfile?.username ?? fallbackHandle ?? null
  const isOwner = Boolean(user && activeProfile && user.id === activeProfile.id)
  const canToggleFollow = Boolean(user && activeProfile && !isOwner)
  const followerCount = activeProfile?.follower_count ?? 0
  const followingCount = activeProfile?.following_count ?? 0

  const handleToggleFollow = async () => {
    if (!user || !activeProfile || isOwner || isUpdatingFollowState) return

    const nextFollowState = !activeProfile.is_followed_by_viewer
    const nextProfile = {
      ...activeProfile,
      is_followed_by_viewer: nextFollowState,
      follower_count: Math.max(
        0,
        activeProfile.follower_count + (nextFollowState ? 1 : -1),
      ),
    } satisfies ProfileWithStats

    setIsUpdatingFollowState(true)
    setFollowError(null)
    setLocalProfile(nextProfile)
    onProfileUpdated?.(nextProfile)

    try {
      if (nextFollowState) {
        await followUser(user.id, activeProfile.id)
      } else {
        await unfollowUser(user.id, activeProfile.id)
      }
    } catch (error) {
      setLocalProfile(activeProfile)
      onProfileUpdated?.(activeProfile)
      setFollowError(
        error instanceof Error ? error.message : 'Failed to update follow state.',
      )
    } finally {
      setIsUpdatingFollowState(false)
    }
  }

  const handleViewProfile = () => {
    if (!publicUsername) return
    onClose()
    navigate(`/u/${publicUsername}`)
  }

  return createPortal(
    (
    <div
      className="fixed inset-0 z-[999] flex items-start justify-center bg-black/80 backdrop-blur-md px-4 pt-24 sm:pt-28"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-sky-500/25 bg-slate-950/98 shadow-[0_24px_80px_rgba(2,8,23,0.75)] ring-1 ring-sky-500/10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-28 sm:h-32 bg-gradient-to-br from-sky-500/35 via-blue-600/30 to-slate-950">
          {activeProfile?.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeProfile.banner_url}
              alt={`${displayName} banner`}
              className="h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full border border-slate-700/80 bg-slate-950/90 px-3 py-1 text-[11px] text-slate-200 hover:border-sky-500/50 hover:text-sky-200 transition-colors"
          >
            Close
          </button>
        </div>

        <div className="relative px-4 sm:px-5 pb-4 sm:pb-5">
          <div className="-mt-9 mb-3 h-18 w-18 sm:h-20 sm:w-20 overflow-hidden rounded-full border-4 border-slate-950 bg-slate-900 shadow-lg shadow-black/40">
            {activeProfile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeProfile.avatar_url}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500/30 to-slate-900 text-xl font-semibold text-slate-100">
                {initials}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2 py-3">
              <div className="h-5 w-36 rounded-full bg-slate-800/80" />
              <div className="h-4 w-20 rounded-full bg-slate-800/60" />
              <div className="h-4 w-28 rounded-full bg-slate-800/60" />
              <div className="h-14 rounded-2xl bg-slate-900/70" />
            </div>
          ) : (
            <div className="space-y-2.5">
              <div>
                <p className="text-base sm:text-lg font-semibold tracking-tight text-slate-50">
                  {displayName}
                </p>
                <p className="text-xs sm:text-sm text-slate-400">
                  {username}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-full border border-slate-800/80 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-400">
                  {formatJoinDate(activeProfile?.created_at)}
                </div>
                <div className="inline-flex items-center rounded-full border border-slate-800/80 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
                  <span className="font-semibold text-slate-100">{followerCount}</span>
                  <span className="ml-1">followers</span>
                </div>
                <div className="inline-flex items-center rounded-full border border-slate-800/80 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
                  <span className="font-semibold text-slate-100">{followingCount}</span>
                  <span className="ml-1">following</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 px-3.5 py-3">
                <p className="text-sm leading-5 text-slate-200">
                  {bio}
                </p>
              </div>

              {followError ? (
                <p className="text-xs text-red-300">{followError}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                {canToggleFollow ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={activeProfile?.is_followed_by_viewer ? 'outline' : 'primary'}
                    onClick={() => void handleToggleFollow()}
                    disabled={isUpdatingFollowState}
                  >
                    {isUpdatingFollowState
                      ? 'Updating...'
                      : activeProfile?.is_followed_by_viewer
                        ? 'Unfollow'
                        : 'Follow'}
                  </Button>
                ) : null}
                {publicUsername ? (
                  <button
                    type="button"
                    onClick={handleViewProfile}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-xs font-medium text-white shadow-md shadow-blue-900/40 transition-colors hover:from-sky-400 hover:to-blue-500"
                  >
                    View public profile
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    ),
    document.body,
  )
}

export default ProfilePreviewModal

