import type { MouseEventHandler } from 'react'
import clsx from 'clsx'

interface ImageGridProps {
  urls: string[]
  onImageClick?: (index: number) => void
  size?: 'default' | 'small'
}

const ImageGrid = ({ urls, onImageClick, size = 'default' }: ImageGridProps) => {
  if (!urls.length) return null

  const handleClick =
    (index: number): MouseEventHandler<HTMLButtonElement> =>
    (event) => {
      event.stopPropagation()
      onImageClick?.(index)
    }

  // Small "sticker" style for comments/replies
  if (size === 'small') {
    return (
      <div className="mt-1 flex flex-wrap gap-2">
        {urls.slice(0, 4).map((url, index) => (
          <button
            key={url}
            type="button"
            onClick={handleClick(index)}
            className="h-24 w-24 overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/70 hover:border-sky-500/70 transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    )
  }

  if (urls.length === 1) {
    return (
      <button
        type="button"
        onClick={handleClick(0)}
        className="mt-2 flex w-full justify-center overflow-hidden rounded-xl border border-slate-800/80 bg-black/40 hover:border-sky-500/60 transition-colors"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[0]}
          alt=""
          className="max-h-[500px] w-auto max-w-full object-contain"
        />
      </button>
    )
  }

  const display = urls.slice(0, 4)
  const remaining = urls.length - display.length

  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5">
      {display.map((url, index) => {
        const isLastWithMore = index === display.length - 1 && remaining > 0
        return (
          <button
            key={url}
            type="button"
            onClick={handleClick(index)}
            className={clsx(
              'relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-sky-500/60 transition-colors',
              'aspect-square sm:aspect-[4/3] flex items-center justify-center',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
            />
            {isLastWithMore ? (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-sm font-semibold text-slate-100">
                +{remaining}
              </div>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export default ImageGrid

