import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Image as ImageIcon, Sparkles } from 'lucide-react'
import Button from '../ui/Button'
import { useAuth } from '../../context/AuthContext'
import { uploadImages } from '../../lib/storage'
import { createPost, type Post } from '../../lib/posts'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
}

const CreatePostModal = ({ isOpen, onClose }: CreatePostModalProps) => {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [spoileredIndices, setSpoileredIndices] = useState<Set<number>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const maxPostImages = 4

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setContent('')
      setFiles([])
      setSpoileredIndices(new Set())
      setError(null)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handlePost = async () => {
    if (!user || isSubmitting) return
    const trimmed = content.trim()
    if (!trimmed) return
    if (trimmed.length > 280) return

    setIsSubmitting(true)
    setError(null)
    try {
      let imageUrls: string[] = []
      if (files.length > 0) {
        const uploadedUrls = await uploadImages(files, 'posts')
        imageUrls = uploadedUrls.map((url, index) =>
          spoileredIndices.has(index) ? `${url}?spoiler=true` : url
        )
      }

      const newPost = await createPost(user.id, trimmed, imageUrls)

      // Dispatch event to update feed instantly
      const event = new CustomEvent<Post>('post-created', { detail: newPost })
      window.dispatchEvent(event)

      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create post.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData.items
    const newFiles: File[] = []
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile()
        if (file) newFiles.push(file)
      }
    }
    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles].slice(0, maxPostImages))
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md px-4 sm:p-0"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-[0_0_80px_rgba(2,132,199,0.15)] ring-1 ring-sky-500/10 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/50 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-50">Create Post</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400 border border-red-500/20">
              {error}
            </div>
          )}

          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onPaste={handlePaste}
            placeholder="What's happening in your universe?"
            className="w-full resize-none bg-transparent px-1 py-2 text-[15px] leading-relaxed text-slate-50 placeholder:text-slate-500 focus-visible:outline-none min-h-[120px]"
          />

          {/* Image Previews */}
          {files.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pr-1">
              {files.map((file, index) => {
                const url = URL.createObjectURL(file)
                const isSpoiler = spoileredIndices.has(index)
                return (
                  <div
                    key={`${file.name}-${index}`}
                    className="group relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900"
                  >
                    <img
                      src={url}
                      alt={file.name}
                      className={`h-full w-full object-cover transition-all duration-300 ${
                        isSpoiler ? 'blur-md brightness-50 scale-105' : ''
                      }`}
                    />
                    
                    {/* Spoiler Toggle Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSpoileredIndices((prev) => {
                          const next = new Set(prev)
                          if (next.has(index)) next.delete(index)
                          else next.add(index)
                          return next
                        })
                      }}
                      className={`absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-medium backdrop-blur-sm ${
                        isSpoiler ? 'text-red-400 opacity-100 bg-black/60' : 'text-slate-200'
                      }`}
                    >
                      {isSpoiler ? 'Spoiler On' : '+ Mark as Spoiler'}
                    </button>

                    {/* Remove Image Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFiles((prev) => prev.filter((_, i) => i !== index))
                        setSpoileredIndices((prev) => {
                          const next = new Set<number>()
                          Array.from(prev).forEach((idx) => {
                            if (idx < index) next.add(idx)
                            if (idx > index) next.add(idx - 1)
                          })
                          return next
                        })
                      }}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-slate-200 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 hover:bg-red-500 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800/50 bg-slate-900/30 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= maxPostImages}
                className="flex items-center justify-center rounded-full p-2 text-sky-400 hover:bg-sky-400/10 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                title="Add Media"
              >
                <ImageIcon className="h-5 w-5" />
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  const selected = Array.from(event.target.files ?? [])
                  const next = [...files, ...selected].slice(0, maxPostImages)
                  setFiles(next)
                }}
              />
              
              <span className="text-xs text-slate-500 font-medium">
                {files.length}/{maxPostImages} images
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative h-6 w-6 sm:h-8 sm:w-8">
                <svg viewBox="0 0 36 36" className="h-full w-full text-slate-800">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={content.length > 280 ? '#ef4444' : content.length > 260 ? '#f59e0b' : '#38bdf8'}
                    strokeWidth="3"
                    strokeDasharray={`${(content.length / 280) * 100}, 100`}
                    className="transition-all duration-300 ease-out"
                  />
                </svg>
              </div>

              <Button
                onClick={handlePost}
                disabled={
                  !content.trim() ||
                  content.length > 280 ||
                  files.length > maxPostImages ||
                  isSubmitting
                }
                className="px-6 py-2 rounded-full font-semibold shadow-lg shadow-sky-500/20"
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  , document.body)
}

export default CreatePostModal
