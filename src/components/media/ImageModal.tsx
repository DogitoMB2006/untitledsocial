import type { KeyboardEvent } from 'react'

interface ImageModalProps {
  urls: string[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

const ImageModal = ({ urls, index, onClose, onPrev, onNext }: ImageModalProps) => {
  if (!urls.length) return null

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') onClose()
    if (event.key === 'ArrowLeft') onPrev()
    if (event.key === 'ArrowRight') onNext()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4 py-32"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="relative max-h-[40vh] max-w-[40vw]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[index]}
          alt=""
          className="max-h-[40vh] max-w-[40vw] rounded-2xl border border-slate-700 bg-slate-950 object-contain shadow-2xl shadow-black/80"
        />
        {urls.length > 1 ? (
          <>
            <button
              type="button"
              onClick={onPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-2 py-1 text-xs text-slate-100 hover:bg-black/80"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={onNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-2 py-1 text-xs text-slate-100 hover:bg-black/80"
            >
              ›
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs text-slate-100 hover:bg-black/90"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default ImageModal

