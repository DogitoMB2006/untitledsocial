import type { KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'

interface ImageModalProps {
  urls: string[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

const ImageModal = ({ urls, index, onClose, onPrev, onNext }: ImageModalProps) => {
  if (!urls.length) return null
  if (typeof document === 'undefined') return null

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') onClose()
    if (event.key === 'ArrowLeft') onPrev()
    if (event.key === 'ArrowRight') onNext()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex h-screen w-screen items-center justify-center bg-black/95 backdrop-blur-2xl p-4 md:p-12 transition-opacity duration-300 animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="relative flex max-h-full max-w-full items-center justify-center transition-transform duration-300 animate-[zoomIn_0.3s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[index]}
          alt=""
          className="max-h-[90vh] max-w-[90vw] rounded-md object-contain shadow-2xl"
        />
        {urls.length > 1 ? (
          <>
            <button
              type="button"
              onClick={onPrev}
              className="absolute -left-12 top-1/2 -translate-y-1/2 rounded-full bg-slate-800/50 p-3 text-lg text-slate-100 hover:bg-slate-700/80 hidden sm:block"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={onPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-lg text-slate-100 hover:bg-black/80 sm:hidden"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={onNext}
              className="absolute -right-12 top-1/2 -translate-y-1/2 rounded-full bg-slate-800/50 p-3 text-lg text-slate-100 hover:bg-slate-700/80 hidden sm:block"
            >
              ›
            </button>
            <button
              type="button"
              onClick={onNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-lg text-slate-100 hover:bg-black/80 sm:hidden"
            >
              ›
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 rounded-full bg-slate-800/50 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700/80 hidden sm:block"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-full bg-black/50 px-3 py-1.5 text-xs text-slate-100 hover:bg-black/80 sm:hidden"
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  )
}

export default ImageModal

