import { Diamond } from 'lucide-react'

export function PropertyBindingIcon({
  bound = false,
  className = 'size-3.5'
}: {
  bound?: boolean
  className?: string
}) {
  return (
    <span className={`relative inline-flex ${className}`} data-bound={bound ? '' : undefined}>
      <Diamond className="size-full" />
      {bound ? (
        <span className="absolute top-1/2 left-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
      ) : null}
    </span>
  )
}
