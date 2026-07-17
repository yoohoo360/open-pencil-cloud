import { useI18n } from '@open-pencil/react'
import type { LayerNode } from '@open-pencil/react'

import { Tip } from '../ui/Tip'

import IconLucideLock from '~icons/lucide/lock'
import IconLucideUnlock from '~icons/lucide/unlock'
import IconLucideEye from '~icons/lucide/eye'
import IconLucideEyeOff from '~icons/lucide/eye-off'

export interface LayerTreeActionsProps {
  node: LayerNode
  selected: boolean
  onToggleLock?: () => void
  onToggleVisibility?: () => void
}

export function LayerTreeActions({ node, selected, onToggleLock, onToggleVisibility }: LayerTreeActionsProps) {
  const { menu: t } = useI18n()

  return (
    <span
      className={`flex shrink-0 items-center gap-0.5 ${
        !node.locked && node.visible ? 'opacity-0 group-hover/row:opacity-100' : ''
      }`}
    >
      <Tip label={node.locked ? t.unlock : t.lock}>
        <button
          type="button"
          className="flex size-4 items-center justify-center rounded hover:bg-white/15"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggleLock?.() }}
        >
          {node.locked ? (
            <IconLucideLock className={`size-3 ${selected ? 'text-white' : 'text-surface'}`} />
          ) : (
            <IconLucideUnlock className={`size-3 opacity-0 group-hover/row:opacity-100 ${selected ? 'text-white/80' : 'text-surface/70'}`} />
          )}
        </button>
      </Tip>
      <Tip label={node.visible ? t.hide : t.show}>
        <button
          type="button"
          className="flex size-4 items-center justify-center rounded hover:bg-white/15"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggleVisibility?.() }}
        >
          {!node.visible ? (
            <IconLucideEyeOff className={`size-3 ${selected ? 'text-white' : 'text-surface'}`} />
          ) : (
            <IconLucideEye className={`size-3 opacity-0 group-hover/row:opacity-100 ${selected ? 'text-white/80' : 'text-surface/70'}`} />
          )}
        </button>
      </Tip>
    </span>
  )
}
