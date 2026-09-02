import IconPanelTop from '~icons/lucide/panel-top'
import IconPanelRight from '~icons/lucide/panel-right'
import IconPanelBottom from '~icons/lucide/panel-bottom'
import IconPanelLeft from '~icons/lucide/panel-left'
import IconSeparatorVertical from '~icons/lucide/separator-vertical'
import IconSeparatorHorizontal from '~icons/lucide/separator-horizontal'

import { useLayoutControlsContext } from '@open-pencil/react'
import { VariableNumberField } from '@/components/properties/VariableNumberField'
import type { PaddingProp } from '@/components/properties/LayoutSection/types'

const paddingSides: Array<{ prop: PaddingProp; side: string }> = [
  { prop: 'paddingTop', side: 'top' },
  { prop: 'paddingRight', side: 'right' },
  { prop: 'paddingBottom', side: 'bottom' },
  { prop: 'paddingLeft', side: 'left' }
]

function PaddingIcon({ side }: { side: string }) {
  if (side === 'top') return <IconPanelTop className="size-3.5" />
  if (side === 'right') return <IconPanelRight className="size-3.5" />
  if (side === 'bottom') return <IconPanelBottom className="size-3.5" />
  return <IconPanelLeft className="size-3.5" />
}

export function PaddingControls() {
  const ctx = useLayoutControlsContext()
  const node = ctx.node.value
  if (!node) return null

  if (!ctx.showIndividualPadding.value && ctx.hasSymmetricPadding.value) {
    return (
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <VariableNumberField
          data-test-id="layout-horizontal-padding-input"
          value={Math.round(node.paddingLeft)}
          min={0}
          nodeId={node.id}
          bindingPath="paddingLeft"
          iconSlot={<IconSeparatorVertical className="size-3.5" />}
          onChange={ctx.setHorizontalPadding}
          onCommit={ctx.commitHorizontalPadding}
        />
        <VariableNumberField
          data-test-id="layout-vertical-padding-input"
          value={Math.round(node.paddingTop)}
          min={0}
          nodeId={node.id}
          bindingPath="paddingTop"
          iconSlot={<IconSeparatorHorizontal className="size-3.5" />}
          onChange={ctx.setVerticalPadding}
          onCommit={ctx.commitVerticalPadding}
        />
      </div>
    )
  }

  if (ctx.isGrid.value || ctx.isFlex.value) {
    return (
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        {paddingSides.map((side) => (
          <VariableNumberField
            key={side.prop}
            value={Math.round(node[side.prop])}
            min={0}
            nodeId={node.id}
            bindingPath={side.prop}
            iconSlot={<PaddingIcon side={side.side} />}
            onChange={(v) => ctx.updateProp(side.prop, v)}
            onCommit={(v, p) => ctx.commitProp(side.prop, v, p)}
          />
        ))}
      </div>
    )
  }

  return null
}
