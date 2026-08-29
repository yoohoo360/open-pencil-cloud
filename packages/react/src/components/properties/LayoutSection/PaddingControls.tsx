import {
  Minus,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PanelTop,
  Plus,
  SeparatorHorizontal,
  SeparatorVertical
} from 'lucide-react'

import { VariableNumberField } from '#react/components/properties/VariableNumberField'
import { useLayoutControlsContext } from '#react/controls/layout/use'

type PaddingProp = 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft'

const paddingSides: Array<{ prop: PaddingProp; icon: 'top' | 'right' | 'bottom' | 'left' }> = [
  { prop: 'paddingTop', icon: 'top' },
  { prop: 'paddingRight', icon: 'right' },
  { prop: 'paddingBottom', icon: 'bottom' },
  { prop: 'paddingLeft', icon: 'left' }
]

export function PaddingControls() {
  const ctx = useLayoutControlsContext()
  const node = ctx.node
  if (!node) return null

  if (!ctx.showIndividualPadding && ctx.hasSymmetricPadding) {
    return (
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <VariableNumberField
          data-property="paddingLeft"
          min={0}
          value={Math.round(node.paddingLeft)}
          icon={<SeparatorVertical className="size-3.5" />}
          nodeId={node.id}
          bindingPath="paddingLeft"
          onCommit={(value, previous) => {
            ctx.setHorizontalPadding(value)
            ctx.commitHorizontalPadding(value, previous)
          }}
        />
        <VariableNumberField
          data-property="paddingTop"
          min={0}
          value={Math.round(node.paddingTop)}
          icon={<SeparatorHorizontal className="size-3.5" />}
          nodeId={node.id}
          bindingPath="paddingTop"
          onCommit={(value, previous) => {
            ctx.setVerticalPadding(value)
            ctx.commitVerticalPadding(value, previous)
          }}
        />
      </div>
    )
  }

  if (!ctx.isGrid && !ctx.isFlex) return null

  return (
    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
      {paddingSides.map((side) => (
        <VariableNumberField
          key={side.prop}
          min={0}
          value={Math.round(node[side.prop])}
          icon={<PaddingIcon icon={side.icon} />}
          nodeId={node.id}
          bindingPath={side.prop}
          onCommit={(value, previous) => ctx.commitProp(side.prop, value, previous)}
        />
      ))}
    </div>
  )
}

function PaddingIcon({ icon }: { icon: 'top' | 'right' | 'bottom' | 'left' }) {
  if (icon === 'top') return <PanelTop className="size-3.5" />
  if (icon === 'right') return <PanelRight className="size-3.5" />
  if (icon === 'bottom') return <PanelBottom className="size-3.5" />
  return <PanelLeft className="size-3.5" />
}

export function PaddingToggleButton() {
  const ctx = useLayoutControlsContext()
  const showMinus = ctx.showIndividualPadding || !ctx.hasUniformPadding
  return (
    <button
      type="button"
      className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded border border-border bg-transparent text-muted hover:bg-hover hover:text-surface"
      onClick={ctx.toggleIndividualPadding}
    >
      {showMinus ? <Minus className="size-3" /> : <Plus className="size-3" />}
    </button>
  )
}
