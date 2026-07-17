import type { LayerNode } from '@open-pencil/react'

import { COMPONENT_TYPES, nodeIcon } from '@/app/editor/icons'
import type { LayerTreeChrome, LayerTreeItemActions } from './types'
import { LayerTreeActions } from './LayerTreeActions'
import { LayerTreeDisclosure } from './LayerTreeDisclosure'
import { LayerTreeDropIndicator } from './LayerTreeDropIndicator'

export interface LayerTreeNodeRowProps {
  node: LayerNode
  level: number
  hasChildren: boolean
  selected: boolean
  padLeft: string
  expanded: boolean
  actions: LayerTreeItemActions
  chrome: LayerTreeChrome
  onRenameStart?: (id: string, name: string) => void
}

export function LayerTreeNodeRow({
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
  const Icon = nodeIcon(node)
  const isDragTarget =
    chrome.instructionTargetId === node.id && chrome.instruction?.type === 'make-child'

  return (
    <div
      data-test-id="layers-item"
      className={[
        'group/row relative flex w-full cursor-pointer items-center gap-1 rounded border-none py-1 pr-1 text-left text-xs',
        selected ? 'bg-accent text-white' : 'bg-transparent text-surface hover:bg-hover',
        chrome.draggingId === node.id ? 'opacity-30' : '',
        isDragTarget ? 'bg-accent/15 text-surface outline-2 outline-accent outline-offset-[-2px]' : '',
        !node.visible ? 'opacity-50' : ''
      ].filter(Boolean).join(' ')}
      style={{ paddingLeft: padLeft }}
      onDoubleClick={() => onRenameStart?.(node.id, node.name)}
    >
      <LayerTreeDisclosure
        expanded={expanded}
        visible={hasChildren}
        onToggle={actions.toggleExpand}
      />
      <Icon
        className={`size-3 shrink-0 ${COMPONENT_TYPES.has(node.type) ? 'text-component opacity-100' : 'opacity-70'}`}
      />
      <span className="min-w-0 flex-1 truncate">{node.name}</span>
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
}
