import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Comment, Post } from '../../lib/posts'
import {
  createComment,
  deletePost,
  deleteComment,
  fetchComments,
  fetchLikeState,
  likePost,
  updateComment,
  unlikePost,
} from '../../lib/posts'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { useAuth } from '../../context/AuthContext'
import ImageGrid from '../media/ImageGrid'
import ImageModal from '../media/ImageModal'
import ProfilePreviewModal from '../profile/ProfilePreviewModal'
import { uploadImages } from '../../lib/storage'
import {
  getProfileWithStatsByUserId,
  type ProfileWithStats,
} from '../../lib/profile'

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
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null)
  const [isDeletingComment, setIsDeletingComment] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentInput, setEditCommentInput] = useState('')
  const [isSavingCommentEdit, setIsSavingCommentEdit] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [commentInput, setCommentInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [commentFiles, setCommentFiles] = useState<File[]>([])
  const [spoileredIndices, setSpoileredIndices] = useState<Set<number>>(new Set())
  const commentFileInputRef = useRef<HTMLInputElement | null>(null)
  const commentComposerRef = useRef<HTMLTextAreaElement | null>(null)
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [modalUrls, setModalUrls] = useState<string[] | null>(null)
  const [showProfilePreview, setShowProfilePreview] = useState(false)
  const [previewProfile, setPreviewProfile] = useState<ProfileWithStats | null>(null)
  const [profilePreviewFallbackName, setProfilePreviewFallbackName] = useState('User')
  const [profilePreviewFallbackHandle, setProfilePreviewFallbackHandle] = useState<string | undefined>(
    undefined,
  )
  const [isLoadingProfilePreview, setIsLoadingProfilePreview] = useState(false)
  const maxCommentImages = 2

  const authorName = post.profiles?.display_name ?? post.profiles?.username ?? 'User'
  const handle = post.profiles?.username ? `@${post.profiles.username}` : ''
  const trimmedCommentInput = commentInput.trim()
  const editingComment = editingCommentId
    ? comments.find((comment) => comment.id === editingCommentId) ?? null
    : null
  const trimmedEditCommentInput = editCommentInput.trim()
  const canSubmitComment =
    Boolean(user) &&
    !isSubmitting &&
    commentFiles.length <= maxCommentImages &&
    trimmedCommentInput.length <= 280 &&
    (trimmedCommentInput.length > 0 || commentFiles.length > 0)
  const canSaveCommentEdit =
    Boolean(user && editingComment && user.id === editingComment.user_id) &&
    !isSavingCommentEdit &&
    trimmedEditCommentInput.length <= 280 &&
    (trimmedEditCommentInput.length > 0 || Boolean(editingComment?.image_urls?.length))

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId) {
        setOpenDropdownId(null)
      }
    }
    if (openDropdownId) {
      document.addEventListener('click', handleClickOutside)
    }
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [openDropdownId])

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

  const handleOpenProfilePreview = async (
    targetUserId: string,
    fallbackName: string,
    fallbackHandle?: string,
  ) => {
    setShowProfilePreview(true)
    setProfilePreviewFallbackName(fallbackName)
    setProfilePreviewFallbackHandle(fallbackHandle)
    setIsLoadingProfilePreview(true)
    setPreviewProfile((current) => (current?.id === targetUserId ? current : null))

    try {
      const profile = await getProfileWithStatsByUserId(targetUserId, user?.id ?? null)
      setPreviewProfile(profile)
    } finally {
      setIsLoadingProfilePreview(false)
    }
  }

  const resetCommentComposer = () => {
    setCommentInput('')
    setCommentFiles([])
    setSpoileredIndices(new Set())
    setReplyToCommentId(null)
    if (commentFileInputRef.current) {
      commentFileInputRef.current.value = ''
    }
  }

  const handleCommentFileSelection = (files: File[]) => {
    setCommentFiles((current) => [...current, ...files].slice(0, maxCommentImages))
  }

  const beginCommentReply = (commentId: string) => {
    if (!user) return
    setEditingCommentId(null)
    setEditCommentInput('')
    setReplyToCommentId(commentId)
    setTimeout(() => {
      commentComposerRef.current?.focus()
    }, 0)
  }

  const beginCommentEdit = (comment: Comment) => {
    setError(null)
    setReplyToCommentId(null)
    setEditingCommentId(comment.id)
    setEditCommentInput(comment.content)
  }

  const cancelCommentEdit = () => {
    setEditingCommentId(null)
    setEditCommentInput('')
  }

  const handleSubmitComment = async () => {
    if (!user || isSubmitting) return
    if (!trimmedCommentInput && commentFiles.length === 0) return
    if (trimmedCommentInput.length > 280) return

    setIsSubmitting(true)
    setError(null)
    try {
      let imageUrls: string[] = []
      if (commentFiles.length > 0) {
        const uploadedUrls = await uploadImages(commentFiles, 'comments')
        imageUrls = uploadedUrls.map((url, index) =>
          spoileredIndices.has(index) ? `${url}?spoiler=true` : url,
        )
      }

      const newComment = await createComment(post.id, user.id, trimmedCommentInput, {
        parentCommentId: replyToCommentId ?? undefined,
        imageUrls,
      })

      setComments((current) => [...current, newComment])
      resetCommentComposer()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to add comment.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveCommentEdit = async (comment: Comment) => {
    if (!user || isSavingCommentEdit) return
    if (!trimmedEditCommentInput && comment.image_urls.length === 0) return
    if (trimmedEditCommentInput.length > 280) return

    setIsSavingCommentEdit(true)
    setError(null)
    try {
      const updatedComment = await updateComment(comment.id, user.id, trimmedEditCommentInput)
      setComments((current) =>
        current.map((entry) => (entry.id === comment.id ? updatedComment : entry)),
      )
      cancelCommentEdit()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update comment.'
      setError(message)
    } finally {
      setIsSavingCommentEdit(false)
    }
  }

  const renderComment = (comment: Comment, isReply = false) => {
    const commentAuthor =
      comment.profiles?.display_name ??
      comment.profiles?.username ??
      'User'
    const commentHandle = comment.profiles?.username
      ? `@${comment.profiles.username}`
      : ''
    const isEditing = editingCommentId === comment.id

    return (
      <div
        key={comment.id}
        className={`rounded-2xl border p-3 ${
          isReply
            ? 'border-slate-800/70 bg-slate-950/60'
            : 'border-slate-800/80 bg-slate-900/40'
        }`}
      >
        <div className="flex gap-2.5 text-[11px]">
          <button
            type="button"
            className="mt-0.5 h-7 w-7 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[9px] text-slate-200 overflow-hidden shrink-0 transition-colors hover:border-sky-500/60"
            onClick={() =>
              void handleOpenProfilePreview(
                comment.user_id,
                commentAuthor,
                comment.profiles?.username,
              )
            }
            aria-label={`Open ${commentAuthor} profile preview`}
          >
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
          </button>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start gap-2 flex-wrap">
              <button
                type="button"
                className="min-w-0 rounded-xl -m-1 px-1 py-0.5 text-left transition-colors hover:bg-slate-900/60"
                onClick={() =>
                  void handleOpenProfilePreview(
                    comment.user_id,
                    commentAuthor,
                    comment.profiles?.username,
                  )
                }
              >
                <span className="font-semibold text-slate-100">
                  {commentAuthor}
                </span>
                {commentHandle ? (
                  <span className="ml-1.5 text-slate-500">
                    {commentHandle}
                  </span>
                ) : null}
              </button>
              <span className="ml-auto text-[10px] text-slate-500">
                {new Date(comment.created_at).toLocaleTimeString()}
              </span>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                {comment.image_urls?.length ? (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      Attached images stay on this comment
                    </p>
                    <ImageGrid
                      urls={comment.image_urls}
                      size="small"
                      onImageClick={(index) => {
                        setModalUrls(comment.image_urls)
                        setSelectedImageIndex(index)
                      }}
                    />
                  </div>
                ) : null}
                <textarea
                  value={editCommentInput}
                  onChange={(event) => setEditCommentInput(event.target.value)}
                  maxLength={280}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-50 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500"
                  placeholder="Update your comment..."
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-slate-500">
                    {trimmedEditCommentInput.length}/280
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="px-2.5"
                      onClick={cancelCommentEdit}
                      disabled={isSavingCommentEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="px-3"
                      onClick={() => void handleSaveCommentEdit(comment)}
                      disabled={!canSaveCommentEdit}
                    >
                      {isSavingCommentEdit ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {comment.content ? (
                  <p className="text-[12px] text-slate-100 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                ) : (
                  <p className="text-[11px] italic text-slate-500">
                    Image-only comment
                  </p>
                )}
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
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[10px] font-medium text-slate-300 transition-colors hover:border-sky-500/50 hover:text-sky-300 disabled:opacity-50"
                    onClick={() => beginCommentReply(comment.id)}
                    disabled={!user}
                  >
                    Reply
                  </button>
                  {user?.id === comment.user_id ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenDropdownId(openDropdownId === comment.id ? null : comment.id)
                        }}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 text-slate-300 transition-colors hover:border-sky-500/50 hover:text-sky-300"
                        aria-label="Comment options"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                      
                      {openDropdownId === comment.id && (
                        <div className="absolute left-0 top-full mt-1.5 w-28 rounded-xl border border-slate-700 bg-slate-800 shadow-xl z-20 overflow-hidden py-1 animate-in zoom-in-95 duration-100">
                          <button
                            type="button"
                            className="w-full px-3 py-1.5 text-left text-[11px] font-medium text-slate-200 hover:bg-slate-700/80 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenDropdownId(null)
                              beginCommentEdit(comment)
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="w-full px-3 py-1.5 text-left text-[11px] font-medium text-red-400 hover:bg-slate-700/80 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenDropdownId(null)
                              setCommentToDelete(comment)
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="p-4 space-y-3 border-slate-800/90 hover:border-sky-500/60 hover:shadow-sky-700/40 transition-all">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() =>
            void handleOpenProfilePreview(post.user_id, authorName, post.profiles?.username)
          }
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
              onClick={() =>
                void handleOpenProfilePreview(post.user_id, authorName, post.profiles?.username)
              }
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
            <div className="space-y-2">
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
                  return (
                    <div
                      key={comment.id}
                      className="space-y-2"
                    >
                      {renderComment(comment)}
                      {replies.length > 0 ? (
                        <div className="space-y-2 border-l border-slate-800/80 pl-4 ml-3">
                          {replies.map((reply) => renderComment(reply, true))}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
            </div>
          )}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-3 space-y-3">
            {replyToCommentId ? (() => {
              const replyTarget = comments.find((comment) => comment.id === replyToCommentId)
              const replyTargetName =
                replyTarget?.profiles?.display_name ??
                replyTarget?.profiles?.username ??
                'User'
              return (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-[10px] text-sky-200">
                  <span>
                    Replying to <span className="font-semibold">@{replyTargetName}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyToCommentId(null)}
                    className="rounded-full border border-sky-500/20 px-2 py-0.5 text-[10px] hover:border-red-400/40 hover:text-red-300"
                    title="Cancel reply"
                  >
                    Cancel
                  </button>
                </div>
              )
            })() : null}
            <div className="space-y-2">
              <textarea
                ref={commentComposerRef}
                rows={3}
                className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-[12px] text-slate-50 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 disabled:opacity-50"
                placeholder={
                  user
                    ? replyToCommentId
                      ? 'Write a reply or drop an image...'
                      : 'Add a comment or drop an image...'
                    : 'Sign in to comment.'
                }
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
                    handleCommentFileSelection(newFiles)
                  }
                }}
                disabled={!user}
              />
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[10px] font-medium text-slate-300 transition-colors hover:border-sky-500/50 hover:text-sky-300 disabled:opacity-50"
                    onClick={() => commentFileInputRef.current?.click()}
                    disabled={!user}
                  >
                    Add images
                  </button>
                  <input
                    ref={commentFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      const selected = Array.from(event.target.files ?? [])
                      handleCommentFileSelection(selected)
                      event.target.value = ''
                    }}
                  />
                  <span className="text-[10px] text-slate-500">
                    {commentFiles.length}/{maxCommentImages} images
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">
                  {trimmedCommentInput.length}/280
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              {(commentInput || commentFiles.length > 0 || replyToCommentId) && user ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-3"
                  onClick={resetCommentComposer}
                  disabled={isSubmitting}
                >
                  Clear
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="text-[11px] px-3 transition-colors"
                disabled={!canSubmitComment}
                onClick={() => void handleSubmitComment()}
              >
                {isSubmitting ? 'Posting...' : (replyToCommentId ? 'Reply' : 'Post')}
              </Button>
            </div>
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
      {commentToDelete && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-semibold text-slate-50">Delete Comment?</h3>
                <p className="mt-2 text-sm text-slate-400">
                  This will permanently remove your comment from the conversation.
                </p>
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
                  {commentToDelete.content ? commentToDelete.content : 'Image-only comment'}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setCommentToDelete(null)}
                    disabled={isDeletingComment}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-red-500 hover:bg-red-600 text-white border-red-500"
                    disabled={isDeletingComment}
                    onClick={async () => {
                      if (!user) return
                      setIsDeletingComment(true)
                      try {
                        await deleteComment(commentToDelete.id, user.id)
                        setComments((current) =>
                          current.filter((comment) => comment.id !== commentToDelete.id),
                        )
                        if (editingCommentId === commentToDelete.id) {
                          cancelCommentEdit()
                        }
                        if (replyToCommentId === commentToDelete.id) {
                          setReplyToCommentId(null)
                        }
                        setCommentToDelete(null)
                      } catch (err) {
                        const message =
                          err instanceof Error ? err.message : 'Failed to delete comment.'
                        setError(message)
                      } finally {
                        setIsDeletingComment(false)
                      }
                    }}
                  >
                    {isDeletingComment ? 'Deleting...' : 'Delete'}
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
        profile={previewProfile}
        fallbackName={profilePreviewFallbackName}
        fallbackHandle={profilePreviewFallbackHandle}
        onProfileUpdated={setPreviewProfile}
        onClose={() => setShowProfilePreview(false)}
      />
    </Card>
  )
}

export default PostCard

