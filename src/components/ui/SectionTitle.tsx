import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

interface SectionTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

const SectionTitle = ({ className, ...props }: SectionTitleProps) => {
  return (
    <h2
      className={clsx(
        'text-lg sm:text-xl font-semibold tracking-tight text-slate-50',
        className,
      )}
      {...props}
    />
  )
}

export default SectionTitle

