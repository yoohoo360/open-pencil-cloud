import IconLucideEye from '~icons/lucide/eye'
import IconLucideEyeOff from '~icons/lucide/eye-off'
import IconLucideLock from '~icons/lucide/lock'
import IconLucideUnlock from '~icons/lucide/unlock'
import { memo, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import type { LayerNode } from '@open-pencil/react'
import { useI18n } from '@open-pencil/react'
import Tip from '@/components/ui/Tip'
import { useLayerTreeUI } from '@/components/LayerTree/ui'
import layerTreeTheme from '@/theme/layer-tree'

export type LayerTreeActionsProps = {
  node: LayerNode
  selected: boolean
  onToggleLock: () => void
  onToggleVisibility: () => void
}

export const LayerTreeActions = memo(function LayerTreeActions({
  node,
  selected,
  onToggleLock,
  onToggleVisibility
}: LayerTreeActionsProps) {
  const { menu: t } = useI18n()
  const ui = useLayerTreeUI()
  const layerTree = tv(layerTreeTheme)
  const styles = useMemo(() => layerTree({ actionsVisible: node.locked || !node.visible }), [layerTree, node.locked, node.visible])
  const lockStyles = useMemo(() => layerTree({ actionActive: node.locked }), [layerTree, node.locked])
  const visibilityStyles = useMemo(
    () => layerTree({ actionActive: !node.visible }),
    [layerTree, node.visible]
  )

  return (
    <span
      data-slot="actions"
      data-selected={selected || undefined}
      data-persistent={node.locked || !node.visible || undefined}
      className={styles.actions({ class: ui?.actions })}
    >
      <Tip label={node.locked ? t.unlock : t.lock}>
        <button
          type="button"
          data-slot="action"
          aria-label={node.locked ? t.unlock : t.lock}
          className={styles.action({ class: ui?.action })}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onToggleLock()
          }}
        >
          {node.locked ? (
            <IconLucideLock
              data-slot="action-icon"
              className={lockStyles.actionIcon({ class: ui?.actionIcon })}
            />
          ) : (
            <IconLucideUnlock
              data-slot="action-icon"
              className={lockStyles.actionIcon({ class: ui?.actionIcon })}
            />
          )}
        </button>
      </Tip>
      <Tip label={node.visible ? t.hide : t.show}>
        <button
          type="button"
          data-slot="action"
          aria-label={node.visible ? t.hide : t.show}
          className={styles.action({ class: ui?.action })}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onToggleVisibility()
          }}
        >
          {!node.visible ? (
            <IconLucideEyeOff
              data-slot="action-icon"
              className={visibilityStyles.actionIcon({ class: ui?.actionIcon })}
            />
          ) : (
            <IconLucideEye
              data-slot="action-icon"
              className={visibilityStyles.actionIcon({ class: ui?.actionIcon })}
            />
          )}
        </button>
      </Tip>
    </span>
  )
})

LayerTreeActions.displayName = 'LayerTreeActions'
export default LayerTreeActions
