import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

const Card = ({ className, ...props }: CardProps) => {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/80 to-slate-950/90 shadow-xl shadow-black/40 backdrop-blur',
        className,
      )}
      {...props}
    />
  )
}

export default Card

