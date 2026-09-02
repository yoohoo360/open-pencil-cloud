import type { ComponentType, MouseEventHandler } from 'react'

export interface ToolButtonProps {
  icon: ComponentType<{ className?: string }>
  active?: boolean
  mobile?: boolean
  'data-test-id'?: string
  onClick?: MouseEventHandler<HTMLButtonElement>
}

export function ToolButton({ icon: Icon, active = false, mobile = false, onClick, ...rest }: ToolButtonProps) {
  return (
    <button
      type="button"
      className={[
        'flex size-8 cursor-pointer items-center justify-center border-none transition-colors',
        mobile ? 'rounded-[6px] select-none' : 'rounded-lg',
        active
          ? 'bg-accent text-white'
          : (mobile
            ? 'bg-transparent text-muted active:bg-hover'
            : 'bg-transparent text-muted hover:bg-hover hover:text-surface')
      ].join(' ')}
      onClick={onClick}
      {...rest}
    >
      <Icon className="size-4" />
    </button>
  )
}
