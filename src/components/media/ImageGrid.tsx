import type { MouseEventHandler } from 'react'
import { useState } from 'react'
import clsx from 'clsx'

interface ImageGridProps {
  urls: string[]
  onImageClick?: (index: number) => void
  size?: 'default' | 'small'
}

const ImageGrid = ({ urls, onImageClick, size = 'default' }: ImageGridProps) => {
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<number>>(new Set())

  if (!urls.length) return null

  const handleClick =
    (index: number, isSpoiler: boolean): MouseEventHandler<HTMLButtonElement> =>
    (event) => {
      event.stopPropagation()
      if (isSpoiler && !revealedSpoilers.has(index)) {
        // Reveal locally, don't open modal yet
        setRevealedSpoilers(prev => new Set(prev).add(index))
      } else {
        // Open modal
        onImageClick?.(index)
      }
    }

  // Small "sticker" style for comments/replies
  if (size === 'small') {
    return (
      <div className="mt-1 flex flex-wrap gap-2">
        {urls.slice(0, 4).map((url, index) => {
          const isSpoiler = url.includes('?spoiler=true')
          const isRevealed = revealedSpoilers.has(index)
          const showSpoiler = isSpoiler && !isRevealed

          return (
            <button
              key={url}
              type="button"
              onClick={handleClick(index, isSpoiler)}
              className="relative h-24 w-24 overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/70 hover:border-sky-500/70 transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className={`h-full w-full object-cover transition-all duration-300 ${showSpoiler ? 'blur-md scale-110 brightness-50' : ''}`}
              />
              {showSpoiler && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="bg-black/60 px-2 py-1 rounded text-[10px] font-semibold text-white backdrop-blur-sm">
                    Spoiler
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  if (urls.length === 1) {
    const isSpoiler = urls[0].includes('?spoiler=true')
    const isRevealed = revealedSpoilers.has(0)
    const showSpoiler = isSpoiler && !isRevealed

    return (
      <button
        type="button"
        onClick={handleClick(0, isSpoiler)}
        className="relative mt-2 flex w-full justify-center overflow-hidden rounded-xl border border-slate-800/80 bg-black/40 hover:border-sky-500/60 transition-colors group"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[0]}
          alt=""
          className={`max-h-[500px] w-auto max-w-full object-contain transition-all duration-300 ${showSpoiler ? 'blur-2xl scale-110 brightness-50' : ''}`}
        />
        {showSpoiler && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <div className="bg-black/60 px-4 py-2 rounded-lg backdrop-blur-md flex flex-col items-center gap-1 group-hover:bg-black/80 transition-colors">
              <span className="text-xl">⚠️</span>
              <span className="text-sm font-semibold text-white">Spoiler</span>
              <span className="text-[10px] text-slate-300">Click to reveal</span>
            </div>
          </div>
        )}
      </button>
    )
  }

  const display = urls.slice(0, 4)
  const remaining = urls.length - display.length

  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5">
      {display.map((url, index) => {
        const isLastWithMore = index === display.length - 1 && remaining > 0
        const isSpoiler = url.includes('?spoiler=true')
        const isRevealed = revealedSpoilers.has(index)
        const showSpoiler = isSpoiler && !isRevealed

        return (
          <button
            key={url}
            type="button"
            onClick={handleClick(index, isSpoiler)}
            className={clsx(
              'group relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-sky-500/60 transition-colors',
              'aspect-square sm:aspect-[4/3] flex items-center justify-center',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className={`h-full w-full object-cover transition-all duration-300 ${showSpoiler ? 'blur-2xl scale-110 brightness-50' : ''}`}
            />
            {showSpoiler && !isLastWithMore && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-md flex flex-col items-center group-hover:bg-black/80 transition-colors">
                  <span className="text-xs font-semibold text-white">Spoiler</span>
                </div>
              </div>
            )}
            {isLastWithMore ? (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-sm font-semibold text-slate-100 z-20">
                +{remaining}
                {showSpoiler && <span className="text-[10px] text-slate-400 mt-1 font-normal">(Includes Spoiler)</span>}
              </div>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export default ImageGrid

