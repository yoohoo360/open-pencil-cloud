import { memo } from 'react'

import type { LayerNode } from '@open-pencil/react'

import LayerTreeNodeRow from '@/components/LayerTree/LayerTreeNodeRow'
import LayerTreeRenameRow from '@/components/LayerTree/LayerTreeRenameRow'
import type { LayerRenameControls, LayerTreeChrome, LayerTreeItemActions } from '@/components/LayerTree/types'
import { LayerTreeUIProvider } from '@/components/LayerTree/ui'

function noop() {
  return undefined
}

const actions: LayerTreeItemActions = {
  select: noop,
  toggleExpand: noop,
  toggleVisibility: noop,
  toggleLock: noop,
  rename: noop
}

const renameControls: LayerRenameControls = {
  commit: noop,
  onKeydown: noop,
  focusInput: async (input) => {
    input.focus()
  }
}

function node(id: string, overrides: Partial<LayerNode> = {}): LayerNode {
  return {
    id,
    name: id,
    type: 'RECTANGLE',
    layoutMode: 'NONE',
    visible: true,
    locked: false,
    ...overrides
  }
}

function chrome(overrides: Partial<LayerTreeChrome> = {}): LayerTreeChrome {
  return {
    draggingId: null,
    instruction: null,
    instructionTargetId: null,
    focused: false,
    indent: 16,
    ...overrides
  }
}

const states = [
  { label: 'Normal', node: node('Normal'), selected: false, chrome: chrome() },
  {
    label: 'Selected focused',
    node: node('Selected focused'),
    selected: true,
    chrome: chrome({ focused: true })
  },
  {
    label: 'Selected unfocused',
    node: node('Selected unfocused'),
    selected: true,
    chrome: chrome()
  },
  { label: 'Hidden', node: node('Hidden', { visible: false }), selected: false, chrome: chrome() },
  { label: 'Locked', node: node('Locked', { locked: true }), selected: false, chrome: chrome() },
  {
    label: 'Component',
    node: node('Component', { type: 'COMPONENT' }),
    selected: false,
    chrome: chrome()
  },
  {
    label: 'Dragging',
    node: node('Dragging'),
    selected: false,
    chrome: chrome({ draggingId: 'Dragging' })
  },
  {
    label: 'Child drop',
    node: node('Child drop'),
    selected: false,
    chrome: chrome({
      instruction: { type: 'make-child' },
      instructionTargetId: 'Child drop'
    })
  },
  {
    label: 'Drop above',
    node: node('Drop above'),
    selected: false,
    chrome: chrome({
      instruction: { type: 'reorder-above' },
      instructionTargetId: 'Drop above'
    })
  },
  {
    label: 'Drop below',
    node: node('Drop below'),
    selected: false,
    chrome: chrome({
      instruction: { type: 'reorder-below' },
      instructionTargetId: 'Drop below'
    })
  }
]

export const LayerTreeThemeDemo = memo(function LayerTreeThemeDemo() {
  return (
    <LayerTreeUIProvider>
      <div className="w-72 rounded-lg border border-border bg-panel p-2 shadow-lg">
        <div className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
          Layer Tree states
        </div>
        <div className="space-y-1">
          {states.map((state) => (
            <div key={state.label} aria-label={state.label}>
              <LayerTreeNodeRow
                node={state.node}
                level={1}
                hasChildren
                selected={state.selected}
                padLeft="8px"
                expanded={state.label === 'Normal'}
                actions={actions}
                chrome={state.chrome}
                onRenameStart={noop}
              />
            </div>
          ))}
          <div aria-label="Rename">
            <LayerTreeRenameRow
              node={node('Rename')}
              hasChildren={false}
              padLeft="8px"
              expanded={false}
              actions={actions}
              renameControls={renameControls}
            />
          </div>
        </div>
      </div>
    </LayerTreeUIProvider>
  )
})

LayerTreeThemeDemo.displayName = 'LayerTreeThemeDemo'
export default LayerTreeThemeDemo
