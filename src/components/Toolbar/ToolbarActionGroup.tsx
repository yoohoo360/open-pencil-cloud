import type { ToolbarActionItem } from '@/components/Toolbar/types'

interface ToolbarActionGroupProps {
  actions: ToolbarActionItem[]
  testPrefix: string
  onAction?: (item: ToolbarActionItem) => void
}

export function ToolbarActionGroup({ actions, testPrefix, onAction }: ToolbarActionGroupProps) {
  return (
    <>
      {actions.map((item) => (
        <button
          key={item.label}
          data-test-id={`${testPrefix}-${item.label.toLowerCase()}`}
          className="flex size-8 cursor-pointer items-center justify-center rounded-[6px] border-none bg-transparent text-muted transition-colors select-none active:bg-hover active:text-surface"
          onClick={() => onAction ? onAction(item) : item.action()}
        >
          <item.icon className="size-4" />
        </button>
      ))}
    </>
  )
}
