import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import PostCard from '../../components/feed/PostCard'
import ImageGrid from '../../components/media/ImageGrid'
import ImageModal from '../../components/media/ImageModal'
import { useAuth } from '../../context/AuthContext'
import {
  followUser,
  getProfileWithStatsByUsername,
  type ProfileWithStats,
  unfollowUser,
} from '../../lib/profile'
import {
  fetchCommentsByUserId,
  fetchPostsByUserId,
  type Comment,
  type Post,
} from '../../lib/posts'

const ProfilePage = () => {
  const { username } = useParams()
  const { user } = useAuth()

  const [profile, setProfile] = useState<ProfileWithStats | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [followError, setFollowError] = useState<string | null>(null)
  const [isUpdatingFollowState, setIsUpdatingFollowState] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [modalUrls, setModalUrls] = useState<string[] | null>(null)

  useEffect(() => {
    if (!username) {
      setError('Missing username in route.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    setFollowError(null)

    void (async () => {
      try {
        const viewerAwareProfile = await getProfileWithStatsByUsername(
          username,
          user?.id ?? null,
        )
        if (!viewerAwareProfile) {
          setError('Profile not found.')
          setProfile(null)
          setPosts([])
          setComments([])
          return
        }

        setProfile(viewerAwareProfile)
        const [profilePosts, profileComments] = await Promise.all([
          fetchPostsByUserId(viewerAwareProfile.id),
          fetchCommentsByUserId(viewerAwareProfile.id),
        ])
        setPosts(profilePosts)
        setComments(profileComments)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load profile.',
        )
      } finally {
        setIsLoading(false)
      }
    })()
  }, [username, user?.id])

  if (isLoading) {
    return (
      <Card className="p-6 text-center text-sm text-slate-400">
        Loading profile…
      </Card>
    )
  }

  if (error || !profile) {
    return (
      <Card className="p-6 space-y-3 text-center">
        <p className="text-sm text-red-300">{error ?? 'Unable to load profile.'}</p>
        <Link to="/">
          <Button variant="outline" size="sm">
            Back to Home
          </Button>
        </Link>
      </Card>
    )
  }

  const displayName = profile.display_name || profile.username
  const initials = (displayName[0] ?? 'U').toUpperCase()
  const isOwner = user?.id === profile.id
  const joinedLabel = new Date(profile.created_at).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const handleToggleFollow = async () => {
    if (!user || isOwner || isUpdatingFollowState) return

    const nextFollowState = !profile.is_followed_by_viewer
    const previousProfile = profile
    const nextProfile = {
      ...profile,
      is_followed_by_viewer: nextFollowState,
      follower_count: Math.max(0, profile.follower_count + (nextFollowState ? 1 : -1)),
    } satisfies ProfileWithStats

    setFollowError(null)
    setIsUpdatingFollowState(true)
    setProfile(nextProfile)

    try {
      if (nextFollowState) {
        await followUser(user.id, profile.id)
      } else {
        await unfollowUser(user.id, profile.id)
      }
    } catch (err) {
      setProfile(previousProfile)
      setFollowError(
        err instanceof Error ? err.message : 'Failed to update follow state.',
      )
    } finally {
      setIsUpdatingFollowState(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="relative h-48 sm:h-56 bg-gradient-to-br from-sky-500/30 via-blue-500/20 to-slate-950">
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
          <div className="-mt-14 mb-3 h-28 w-28 overflow-hidden rounded-full border-4 border-slate-950 bg-slate-900 shadow-xl shadow-black/40">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-slate-100">
                {initials}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
                {displayName}
              </h1>
              <p className="text-sm text-slate-400">@{profile.username}</p>
              <p className="text-xs text-slate-500">Joined {joinedLabel}</p>
            </div>
            {isOwner ? (
              <Link to="/settings/profile">
                <Button size="sm">Edit profile</Button>
              </Link>
            ) : user ? (
              <Button
                size="sm"
                variant={profile.is_followed_by_viewer ? 'outline' : 'primary'}
                onClick={() => void handleToggleFollow()}
                disabled={isUpdatingFollowState}
              >
                {isUpdatingFollowState
                  ? 'Updating...'
                  : profile.is_followed_by_viewer
                    ? 'Unfollow'
                    : 'Follow'}
              </Button>
            ) : null}
          </div>

          <p className="mt-3 text-sm text-slate-200">
            {profile.bio?.trim() || 'No bio yet.'}
          </p>

          {followError ? (
            <p className="mt-3 text-xs text-red-300">{followError}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1">
              {profile.post_count} posts
            </span>
            <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1">
              {profile.comment_count} comments
            </span>
            <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1">
              {profile.follower_count} followers
            </span>
            <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1">
              {profile.following_count} following
            </span>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Posts
          </h2>
          {posts.length === 0 ? (
            <Card className="p-4 text-sm text-slate-400">
              No posts yet.
            </Card>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDeleted={(id) =>
                  setPosts((current) => current.filter((item) => item.id !== id))
                }
              />
            ))
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Comments
          </h2>
          {comments.length === 0 ? (
            <Card className="p-4 text-sm text-slate-400">
              No comments yet.
            </Card>
          ) : (
            comments.map((comment) => (
              <Card key={comment.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span>
                    On post{' '}
                    <span className="font-mono text-slate-300">
                      {comment.post_id.slice(0, 8)}
                    </span>
                  </span>
                  <span>{new Date(comment.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-slate-100 whitespace-pre-wrap">
                  {comment.content}
                </p>
                {comment.parent_comment_id ? (
                  <p className="text-[11px] text-slate-500">
                    Reply in thread
                  </p>
                ) : null}
                {comment.image_urls?.length ? (
                  <ImageGrid
                    urls={comment.image_urls}
                    size="small"
                    onImageClick={(index) => {
                      setModalUrls(comment.image_urls)
                      setSelectedImageIndex(index)
                    }}
                  />
                ) : null}
              </Card>
            ))
          )}
        </div>
      </div>

      {selectedImageIndex !== null && modalUrls && modalUrls.length ? (
        <ImageModal
          urls={modalUrls}
          index={selectedImageIndex}
          onClose={() => {
            setSelectedImageIndex(null)
            setModalUrls(null)
          }}
          onPrev={() =>
            setSelectedImageIndex((prev) =>
              prev === null
                ? 0
                : prev === 0
                  ? modalUrls.length - 1
                  : prev - 1,
            )
          }
          onNext={() =>
            setSelectedImageIndex((prev) =>
              prev === null
                ? 0
                : prev === modalUrls.length - 1
                  ? 0
                  : prev + 1,
            )
          }
        />
      ) : null}
    </div>
  )
}

export default ProfilePage
