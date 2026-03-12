import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Comment, Post } from '../../lib/posts'
import {
  createComment,
  deletePost,
  fetchComments,
  fetchLikeState,
  likePost,
  unlikePost,
} from '../../lib/posts'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { useAuth } from '../../context/AuthContext'
import ImageGrid from '../media/ImageGrid'
import ImageModal from '../media/ImageModal'
import ProfilePreviewModal from '../profile/ProfilePreviewModal'
import { uploadImages } from '../../lib/storage'
import { getProfileByUserId, type Profile } from '../../lib/profile'

interface PostCardProps {
  post: Post
  onDeleted?: (id: string) => void
}

const PostCard = ({ post, onDeleted }: PostCardProps) => {
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [commentFiles, setCommentFiles] = useState<File[]>([])
  const [spoileredIndices, setSpoileredIndices] = useState<Set<number>>(new Set())
  const commentFileInputRef = useRef<HTMLInputElement | null>(null)
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [modalUrls, setModalUrls] = useState<string[] | null>(null)
  const [showProfilePreview, setShowProfilePreview] = useState(false)
  const [authorProfile, setAuthorProfile] = useState<Profile | null>(null)
  const [isLoadingProfilePreview, setIsLoadingProfilePreview] = useState(false)
  const maxCommentImages = 2

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

  const handleOpenProfilePreview = async () => {
    setShowProfilePreview(true)

    if (authorProfile?.id === post.user_id) {
      return
    }

    setIsLoadingProfilePreview(true)
    try {
      const profile = await getProfileByUserId(post.user_id)
      setAuthorProfile(profile)
    } finally {
      setIsLoadingProfilePreview(false)
    }
  }

  return (
    <Card className="p-4 space-y-3 border-slate-800/90 hover:border-sky-500/60 hover:shadow-sky-700/40 transition-all">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleOpenProfilePreview}
          className="group mt-0.5 shrink-0 rounded-full"
          aria-label={`Open ${authorName} profile preview`}
        >
          <div className="h-9 w-9 rounded-full bg-slate-900 border border-slate-700 group-hover:border-sky-500/60 flex items-center justify-center text-[10px] font-semibold text-slate-100 overflow-hidden transition-colors">
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
        </button>
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleOpenProfilePreview}
              className="min-w-0 rounded-xl -m-1 px-1 py-0.5 text-left hover:bg-slate-900/40 transition-colors"
            >
              <p className="text-xs font-semibold text-slate-50 truncate hover:text-sky-200 transition-colors">
                {authorName}
              </p>
              {handle ? (
                <p className="text-[10px] text-slate-500 truncate hover:text-slate-300 transition-colors">
                  {handle}
                </p>
              ) : null}
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <p className="text-[10px] text-slate-500">
                {new Date(post.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-100 whitespace-pre-wrap">
            {post.content}
          </p>
          {post.image_urls?.length ? (
            <ImageGrid
              urls={post.image_urls}
              onImageClick={(index) => {
                setModalUrls(post.image_urls)
                setSelectedImageIndex(index)
              }}
            />
          ) : null}
        </div>
        {user?.id === post.user_id ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-1 h-5 w-5 rounded-full border border-slate-700 text-[10px] text-slate-400 hover:border-red-500 hover:text-red-400 flex items-center justify-center transition-colors shrink-0"
            aria-label="Delete post"
          >
            ×
          </button>
        ) : null}
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
          ) : (
            <div className="space-y-1.5">
              {comments.length === 0 ? (
                <p className="text-[11px] text-slate-500">
                  No comments yet. Start the conversation.
                </p>
              ) : null}
              {comments
                .filter((comment) => !comment.parent_comment_id)
                .map((comment) => {
                  const replies = comments.filter(
                    (reply) => reply.parent_comment_id === comment.id,
                  )
                  const commentAuthor =
                    comment.profiles?.display_name ??
                    comment.profiles?.username ??
                    'User'
                  const commentHandle = comment.profiles?.username
                    ? `@${comment.profiles.username}`
                    : ''
                  return (
                    <div
                      key={comment.id}
                      className="space-y-1.5"
                    >
                      <div className="flex gap-2 text-[11px]">
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
                          <button
                            type="button"
                            className="mt-0.5 text-[10px] text-sky-400 hover:text-sky-300"
                            onClick={() => {
                              if (!user) return
                              setReplyToCommentId(comment.id)
                            }}
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                      {replies.length > 0 ? (
                        <div className="space-y-1 border-l border-slate-800/80 pl-4 ml-3">
                          {replies.map((reply) => {
                            const replyAuthor =
                              reply.profiles?.display_name ??
                              reply.profiles?.username ??
                              'User'
                            const replyHandle = reply.profiles?.username
                              ? `@${reply.profiles.username}`
                              : ''
                            return (
                              <div
                                key={reply.id}
                                className="flex gap-2 text-[11px]"
                              >
                                <div className="mt-0.5 h-6 w-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[9px] text-slate-200 overflow-hidden">
                                  {reply.profiles?.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={reply.profiles.avatar_url}
                                      alt={replyAuthor}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    (replyAuthor[0] ?? 'U').toUpperCase()
                                  )}
                                </div>
                                <div className="flex-1 space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-100">
                                      {replyAuthor}
                                    </span>
                                    {replyHandle ? (
                                      <span className="text-slate-500">
                                        {replyHandle}
                                      </span>
                                    ) : null}
                                    <span className="ml-auto text-[10px] text-slate-500">
                                      {new Date(reply.created_at).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <p className="text-slate-100">
                                    {reply.content}
                                  </p>
                                  {reply.image_urls?.length ? (
                                    <ImageGrid
                                      urls={reply.image_urls}
                                      size="small"
                                      onImageClick={(index) => {
                                        setModalUrls(reply.image_urls)
                                        setSelectedImageIndex(index)
                                      }}
                                    />
                                  ) : null}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
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
              onPaste={(event) => {
                const items = event.clipboardData.items
                const newFiles: File[] = []
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.startsWith('image/')) {
                    const file = items[i].getAsFile()
                    if (file) newFiles.push(file)
                  }
                }
                if (newFiles.length > 0) {
                  setCommentFiles((prev) => [...prev, ...newFiles].slice(0, maxCommentImages))
                }
              }}
              disabled={!user}
            />
            <button
              type="button"
              className="text-[10px] text-sky-400 hover:text-sky-300 self-center"
              onClick={() => commentFileInputRef.current?.click()}
            >
              Images
            </button>
            <input
              ref={commentFileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                const selected = Array.from(event.target.files ?? [])
                const next = [...commentFiles, ...selected].slice(0, maxCommentImages)
                setCommentFiles(next)
              }}
            />
            <Button
              size="sm"
              className="text-[11px] px-3 transition-colors"
              disabled={!user || !commentInput.trim() || isSubmitting || commentFiles.length > maxCommentImages}
              onClick={async () => {
                if (!user || isSubmitting) return
                const trimmed = commentInput.trim()
                if (!trimmed) return
                if (trimmed.length > 280) return
                
                setIsSubmitting(true)
                try {
                  let imageUrls: string[] = []
                  if (commentFiles.length > 0) {
                    const uploadedUrls = await uploadImages(commentFiles, 'comments')
                    imageUrls = uploadedUrls.map((url, index) => 
                      spoileredIndices.has(index) ? `${url}?spoiler=true` : url
                    )
                  }
                  const newComment = await createComment(post.id, user.id, trimmed, {
                    parentCommentId: replyToCommentId ?? undefined,
                    imageUrls,
                  })
                  setComments((current) => [...current, newComment])
                  setCommentInput('')
                  setCommentFiles([])
                  setSpoileredIndices(new Set())
                  setReplyToCommentId(null)
                } catch (err) {
                  const message =
                    err instanceof Error ? err.message : 'Failed to add comment.'
                  setError(message)
                } finally {
                  setIsSubmitting(false)
                }
              }}
            >
              {isSubmitting ? 'Posting...' : 'Reply'}
            </Button>
          </div>
          {commentFiles.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1 mt-2">
              {commentFiles.map((file, index) => {
                const url = URL.createObjectURL(file)
                const isSpoiler = spoileredIndices.has(index)
                return (
                  <div
                    key={`${file.name}-${index}`}
                    className="group relative h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900/70"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={file.name}
                      className={`h-full w-full object-cover transition-all ${isSpoiler ? 'blur-md brightness-50' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSpoileredIndices(prev => {
                          const next = new Set(prev)
                          if (next.has(index)) next.delete(index)
                          else next.add(index)
                          return next
                        })
                      }}
                      className={`absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-semibold text-center leading-tight ${isSpoiler ? 'text-red-400 opacity-100 bg-black/60' : 'text-slate-200'}`}
                    >
                      {isSpoiler ? 'Spoiler' : '+ Spoiler'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCommentFiles(prev => prev.filter((_, i) => i !== index))
                        setSpoileredIndices(prev => {
                          const next = new Set<number>()
                          Array.from(prev).forEach(idx => {
                            if (idx < index) next.add(idx)
                            if (idx > index) next.add(idx - 1)
                          })
                          return next
                        })
                      }}
                      className="absolute top-1 right-1 h-4 w-4 rounded-full bg-black/60 text-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white text-xs"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}
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
      
      {showDeleteConfirm && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-semibold text-slate-50">Delete Post?</h3>
                <p className="mt-2 text-sm text-slate-400">
                  This action cannot be undone. This post will be permanently removed.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-red-500 hover:bg-red-600 text-white border-red-500"
                    disabled={isDeleting}
                    onClick={async () => {
                      if (!user) return
                      setIsDeleting(true)
                      try {
                        await deletePost(post.id, user.id)
                        onDeleted?.(post.id)
                        setShowDeleteConfirm(false)
                      } catch (err) {
                        const message =
                          err instanceof Error ? err.message : 'Failed to delete post.'
                        setError(message)
                      } finally {
                        setIsDeleting(false)
                      }
                    }}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    <ProfilePreviewModal
        isOpen={showProfilePreview}
        isLoading={isLoadingProfilePreview}
        profile={authorProfile}
        fallbackName={authorName}
        fallbackHandle={post.profiles?.username}
        onClose={() => setShowProfilePreview(false)}
      />
    </Card>
  )
}

export default PostCard

