import { memo, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import type { LayerNode } from '@open-pencil/react'
import { COMPONENT_TYPES, nodeIcon } from '@/app/editor/icons'
import LayerTreeActions from '@/components/LayerTree/LayerTreeActions'
import LayerTreeDisclosure from '@/components/LayerTree/LayerTreeDisclosure'
import LayerTreeDropIndicator from '@/components/LayerTree/LayerTreeDropIndicator'
import type { LayerTreeChrome, LayerTreeItemActions } from '@/components/LayerTree/types'
import { useLayerTreeUI } from '@/components/LayerTree/ui'
import layerTreeTheme from '@/theme/layer-tree'

export type LayerTreeNodeRowProps = {
  node: LayerNode
  level: number
  hasChildren: boolean
  selected: boolean
  padLeft: string
  expanded: boolean
  actions: LayerTreeItemActions
  chrome: LayerTreeChrome
  onRenameStart: (id: string, name: string) => void
}

export const LayerTreeNodeRow = memo(function LayerTreeNodeRow({
  node,
  level,
  hasChildren,
  selected,
  padLeft,
  expanded,
  actions,
  chrome,
  onRenameStart
}: LayerTreeNodeRowProps) {
  const ui = useLayerTreeUI()
  const layerTree = tv(layerTreeTheme)
  const styles = useMemo(
    () =>
      layerTree({
        selected,
        focused: chrome.focused,
        dragging: chrome.draggingId === node.id,
        visible: node.visible,
        component: COMPONENT_TYPES.has(node.type),
        childDropTarget:
          chrome.instructionTargetId === node.id && chrome.instruction?.type === 'make-child'
      }),
    [chrome.draggingId, chrome.focused, chrome.instruction, chrome.instructionTargetId, layerTree, node.id, node.type, node.visible, selected]
  )
  const NodeIcon = nodeIcon(node)

  return (
    <div
      data-test-id="layers-item"
      data-slot="row"
      data-selected={selected || undefined}
      data-focused={chrome.focused || undefined}
      data-dragging={chrome.draggingId === node.id || undefined}
      data-hidden={!node.visible || undefined}
      data-drop-position={
        chrome.instructionTargetId === node.id && chrome.instruction?.type === 'make-child'
          ? 'child'
          : undefined
      }
      className={styles.row({ class: ui?.row })}
      style={{ paddingLeft: padLeft }}
      onClick={(event) => actions.select(!!(event.metaKey || event.ctrlKey), !!event.shiftKey)}
      onDoubleClick={() => onRenameStart(node.id, node.name)}
    >
      <LayerTreeDisclosure
        expanded={expanded}
        visible={hasChildren}
        onToggle={actions.toggleExpand}
      />
      <NodeIcon data-slot="icon" className={styles.icon({ class: ui?.icon })} />
      <span data-slot="label" className={styles.label({ class: ui?.label })}>
        {node.name}
      </span>
      <LayerTreeActions
        node={node}
        selected={selected}
        onToggleLock={actions.toggleLock}
        onToggleVisibility={actions.toggleVisibility}
      />
      <LayerTreeDropIndicator
        active={chrome.instructionTargetId === node.id}
        instruction={chrome.instruction}
        level={level}
        indent={chrome.indent}
      />
    </div>
  )
})

LayerTreeNodeRow.displayName = 'LayerTreeNodeRow'
export default LayerTreeNodeRow
