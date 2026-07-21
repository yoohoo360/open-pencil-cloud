import { memo, useEffect, useMemo, useRef } from 'react'
import { tv } from 'tailwind-variants'

import type { LayerNode } from '@open-pencil/react'
import { nodeIcon } from '@/app/editor/icons'
import LayerTreeDisclosure from '@/components/LayerTree/LayerTreeDisclosure'
import type { LayerRenameControls, LayerTreeItemActions } from '@/components/LayerTree/types'
import { useLayerTreeUI } from '@/components/LayerTree/ui'
import layerTreeTheme from '@/theme/layer-tree'

export type LayerTreeRenameRowProps = {
  node: LayerNode
  hasChildren: boolean
  padLeft: string
  expanded: boolean
  actions: LayerTreeItemActions
  renameControls: LayerRenameControls
}

export const LayerTreeRenameRow = memo(function LayerTreeRenameRow({
  node,
  hasChildren,
  padLeft,
  expanded,
  actions,
  renameControls
}: LayerTreeRenameRowProps) {
  const renameInputRef = useRef<HTMLInputElement>(null)
  const ui = useLayerTreeUI()
  const layerTree = tv(layerTreeTheme)
  const styles = useMemo(() => layerTree({ expanded }), [expanded, layerTree])
  const NodeIcon = nodeIcon(node)

  useEffect(() => {
    const input = renameInputRef.current
    if (input) void renameControls.focusInput(input)
  }, [renameControls])

  return (
    <div
      data-slot="rename-row"
      className={styles.renameRow({ class: ui?.renameRow })}
      style={{ paddingLeft: padLeft }}
    >
      <LayerTreeDisclosure
        expanded={expanded}
        visible={hasChildren}
        onToggle={actions.toggleExpand}
      />
      <NodeIcon data-slot="rename-icon" className={styles.renameIcon({ class: ui?.renameIcon })} />
      <input
        ref={renameInputRef}
        data-layer-edit
        data-test-id="layers-item-input"
        data-slot="rename-input"
        className={styles.renameInput({ class: ui?.renameInput })}
        defaultValue={node.name}
        onBlur={(event) => renameControls.commit(node.id, event)}
        onKeyDown={(event) => {
          event.stopPropagation()
          renameControls.onKeydown(event)
        }}
      />
    </div>
  )
})

LayerTreeRenameRow.displayName = 'LayerTreeRenameRow'
export default LayerTreeRenameRow
