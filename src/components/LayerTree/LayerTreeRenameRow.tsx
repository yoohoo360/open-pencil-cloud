import { useEffect, useRef } from 'react'
import type { LayerNode } from '@open-pencil/react'

import { nodeIcon } from '@/app/editor/icons'
import type { LayerRenameControls, LayerTreeItemActions } from './types'
import { LayerTreeDisclosure } from './LayerTreeDisclosure'

export interface LayerTreeRenameRowProps {
  node: LayerNode
  hasChildren: boolean
  padLeft: string
  expanded: boolean
  actions: LayerTreeItemActions
  renameControls: LayerRenameControls
}

export function LayerTreeRenameRow({
  node,
  hasChildren,
  padLeft,
  expanded,
  actions,
  renameControls
}: LayerTreeRenameRowProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const Icon = nodeIcon(node)

  useEffect(() => {
    if (inputRef.current) {
      void renameControls.focusInput(inputRef.current)
    }
  }, [renameControls])

  return (
    <div className="flex w-full items-center gap-1 py-1" style={{ paddingLeft: padLeft }}>
      <LayerTreeDisclosure
        expanded={expanded}
        visible={hasChildren}
        onToggle={actions.toggleExpand}
      />
      <Icon className="size-3 shrink-0 opacity-70" />
      <input
        ref={inputRef}
        data-layer-edit
        data-test-id="layers-item-input"
        className="min-w-0 flex-1 rounded border border-accent bg-input px-1 py-0 text-xs text-surface outline-none"
        defaultValue={node.name}
        onBlur={(e) => renameControls.commit(node.id, e.nativeEvent)}
        onKeyDown={(e) => renameControls.onKeydown(e.nativeEvent)}
      />
    </div>
  )
}
