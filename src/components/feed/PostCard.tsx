import { useEffect, useState } from 'react'
import type { Comment, Post } from '../../lib/posts'
import {
  createComment,
  fetchComments,
  fetchLikeState,
  likePost,
  unlikePost,
} from '../../lib/posts'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { useAuth } from '../../context/AuthContext'

interface PostCardProps {
  post: Post
}

const PostCard = ({ post }: PostCardProps) => {
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const authorName = post.profiles?.display_name ?? post.profiles?.username ?? 'User'
  const handle = post.profiles?.username ? `@${post.profiles.username}` : ''

  useEffect(() => {
    let isMounted = true
    setError(null)
    void (async () => {
      try {
        const { liked: initialLiked, count } = await fetchLikeState(post.id, user?.id ?? null)
        if (isMounted) {
          setLiked(initialLiked)
          setLikes(count)
        }
      } catch (err) {
        if (isMounted) {
          const message =
            err instanceof Error ? err.message : 'Failed to load likes.'
          setError(message)
        }
      }
    })()

    return () => {
      isMounted = false
    }
  }, [post.id, user?.id])

  const handleToggleComments = () => {
    const next = !showComments
    setShowComments(next)
    if (next && comments.length === 0 && !isLoadingComments) {
      setIsLoadingComments(true)
      setError(null)
      void (async () => {
        try {
          const data = await fetchComments(post.id)
          setComments(data)
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Failed to load comments.'
          setError(message)
        } finally {
          setIsLoadingComments(false)
        }
      })()
    }
  }

  const toggleLike = async () => {
    if (!user) return
    const nextLiked = !liked
    setLiked(nextLiked)
    setLikes((prev) => (nextLiked ? prev + 1 : Math.max(prev - 1, 0)))

    try {
      if (nextLiked) {
        await likePost(post.id, user.id)
      } else {
        await unlikePost(post.id, user.id)
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update like.'
      setError(message)
    }
  }

  return (
    <Card className="p-4 space-y-3 border-slate-800/90 hover:border-sky-500/60 hover:shadow-sky-700/40 transition-all">
      <div className="flex items-start gap-3">
        <div className="relative mt-0.5">
          <div className="h-9 w-9 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] font-semibold text-slate-100 overflow-hidden">
            {post.profiles?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.profiles.avatar_url}
                alt={authorName}
                className="h-full w-full object-cover"
              />
            ) : (
              (authorName[0] ?? 'U').toUpperCase()
            )}
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-50 truncate">
                {authorName}
              </p>
              {handle ? (
                <p className="text-[10px] text-slate-500 truncate">
                  {handle}
                </p>
              ) : null}
            </div>
            <p className="text-[10px] text-slate-500 shrink-0">
              {new Date(post.created_at).toLocaleTimeString()}
            </p>
          </div>
          <p className="text-sm text-slate-100 whitespace-pre-wrap">
            {post.content}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleLike}
            className="inline-flex items-center gap-1 hover:text-sky-400 transition-colors disabled:opacity-50"
            disabled={!user}
          >
            <span
              className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                liked
                  ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                  : 'border-slate-600 text-slate-400'
              }`}
            >
              ♥
            </span>
            <span>{likes > 0 ? likes : 'Like'}</span>
          </button>
          <button
            type="button"
            onClick={handleToggleComments}
            className="inline-flex items-center gap-1 hover:text-sky-400 transition-colors"
          >
            <span className="h-5 w-5 rounded-full border border-slate-600 flex items-center justify-center text-[9px]">
              💬
            </span>
            <span>Comments</span>
          </button>
        </div>
        <span className="hidden sm:inline text-[10px] text-slate-500">
          NebulaX · prototype interactions
        </span>
      </div>

      {showComments ? (
        <div className="mt-2 border-t border-slate-800/80 pt-2 space-y-2">
          {error ? (
            <p className="text-[11px] text-red-400">
              {error}
            </p>
          ) : null}
          {isLoadingComments ? (
            <p className="text-[11px] text-slate-500">
              Loading comments…
            </p>
          ) : comments.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              No comments yet. Start the conversation.
            </p>
          ) : (
            <div className="space-y-1.5">
              {comments.map((comment) => {
                const commentAuthor =
                  comment.profiles?.display_name ?? comment.profiles?.username ?? 'User'
                const commentHandle = comment.profiles?.username
                  ? `@${comment.profiles.username}`
                  : ''
                return (
                  <div
                    key={comment.id}
                    className="flex gap-2 text-[11px]"
                  >
                    <div className="mt-0.5 h-6 w-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[9px] text-slate-200 overflow-hidden">
                      {comment.profiles?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={comment.profiles.avatar_url}
                          alt={commentAuthor}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (commentAuthor[0] ?? 'U').toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-100">
                          {commentAuthor}
                        </span>
                        {commentHandle ? (
                          <span className="text-slate-500">
                            {commentHandle}
                          </span>
                        ) : null}
                        <span className="ml-auto text-[10px] text-slate-500">
                          {new Date(comment.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-100">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              className="flex-1 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-[11px] text-slate-50 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 disabled:opacity-50"
              placeholder={user ? 'Reply to this post…' : 'Sign in to comment.'}
              value={commentInput}
              onChange={(event) => setCommentInput(event.target.value)}
              disabled={!user}
            />
            <Button
              size="sm"
              className="text-[11px] px-3"
              disabled={!user || !commentInput.trim()}
              onClick={async () => {
                if (!user) return
                const trimmed = commentInput.trim()
                if (!trimmed) return
                try {
                  const newComment = await createComment(post.id, user.id, trimmed)
                  setComments((current) => [...current, newComment])
                  setCommentInput('')
                } catch (err) {
                  const message =
                    err instanceof Error ? err.message : 'Failed to add comment.'
                  setError(message)
                }
              }}
            >
              Reply
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

export default PostCard

