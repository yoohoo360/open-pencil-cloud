import IconLucidePanelBottom from '~icons/lucide/panel-bottom'
import IconLucidePanelLeft from '~icons/lucide/panel-left'
import IconLucidePanelRight from '~icons/lucide/panel-right'
import IconLucidePanelTop from '~icons/lucide/panel-top'
import IconLucideSeparatorHorizontal from '~icons/lucide/separator-horizontal'
import IconLucideSeparatorVertical from '~icons/lucide/separator-vertical'
import { memo } from 'react'

import { useLayoutContext, type PaddingProp } from '@/components/properties/LayoutSection/types'
import VariableNumberField from '@/components/properties/VariableNumberField'

const paddingSides: Array<{ prop: PaddingProp; icon: 'top' | 'right' | 'bottom' | 'left' }> = [
  { prop: 'paddingTop', icon: 'top' },
  { prop: 'paddingRight', icon: 'right' },
  { prop: 'paddingBottom', icon: 'bottom' },
  { prop: 'paddingLeft', icon: 'left' }
]

function paddingIcon(icon: (typeof paddingSides)[number]['icon']) {
  switch (icon) {
    case 'top':
      return <IconLucidePanelTop className="size-3.5" />
    case 'right':
      return <IconLucidePanelRight className="size-3.5" />
    case 'bottom':
      return <IconLucidePanelBottom className="size-3.5" />
    default:
      return <IconLucidePanelLeft className="size-3.5" />
  }
}

export const PaddingControls = memo(function PaddingControls() {
  const ctx = useLayoutContext()

  if (!ctx.showIndividualPadding && ctx.hasSymmetricPadding) {
    return (
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <VariableNumberField
          data-test-id="layout-horizontal-padding-input"
          className="min-w-0"
          value={Math.round(ctx.node.paddingLeft)}
          min={0}
          nodeId={ctx.node.id}
          bindingPath="paddingLeft"
          icon={<IconLucideSeparatorVertical className="size-3.5" />}
          onValueChange={ctx.setHorizontalPadding}
          onCommit={ctx.commitHorizontalPadding}
        />
        <VariableNumberField
          data-test-id="layout-vertical-padding-input"
          className="min-w-0"
          value={Math.round(ctx.node.paddingTop)}
          min={0}
          nodeId={ctx.node.id}
          bindingPath="paddingTop"
          icon={<IconLucideSeparatorHorizontal className="size-3.5" />}
          onValueChange={ctx.setVerticalPadding}
          onCommit={ctx.commitVerticalPadding}
        />
      </div>
    )
  }

  if (ctx.isGrid || ctx.isFlex) {
    return (
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        {paddingSides.map((side) => (
          <VariableNumberField
            key={side.prop}
            value={Math.round(ctx.node[side.prop])}
            min={0}
            nodeId={ctx.node.id}
            bindingPath={side.prop}
            icon={paddingIcon(side.icon)}
            onValueChange={(value) => ctx.updateProp(side.prop, value)}
            onCommit={(value, previous) => ctx.commitProp(side.prop, value, previous)}
          />
        ))}
      </div>
    )
  }

  return null
})

PaddingControls.displayName = 'PaddingControls'
export default PaddingControls
