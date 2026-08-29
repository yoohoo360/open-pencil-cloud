import type { LayoutSizing } from '@open-pencil/scene-graph'

import { NumberField } from '#react/components/inputs/NumberField'
import { PanelGrid } from '#react/components/ui/panel/PanelGrid'
import { Tip } from '#react/components/ui/Tip'
import { useLayoutControlsContext } from '#react/controls/layout/use'
import type { LayoutAxis, SizeLimitProp } from '#react/controls/layout/helpers'
import { useI18n } from '#react/i18n'

type SizeSelectValue = LayoutSizing | `add-${SizeLimitProp}` | `remove-${SizeLimitProp}`

export function SizeControls() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const node = ctx.node
  if (!node) return null

  const sizeLimits = [
    {
      prop: 'minWidth' as const,
      icon: panels.minWidthShort,
      label: panels.minWidthShort,
      setLabel: panels.setToCurrentWidth,
      removeLabel: panels.removeMinWidth
    },
    {
      prop: 'maxWidth' as const,
      icon: panels.maxWidthShort,
      label: panels.maxWidthShort,
      setLabel: panels.setToCurrentWidth,
      removeLabel: panels.removeMaxWidth
    },
    {
      prop: 'minHeight' as const,
      icon: panels.minHeightShort,
      label: panels.minHeightShort,
      setLabel: panels.setToCurrentHeight,
      removeLabel: panels.removeMinHeight
    },
    {
      prop: 'maxHeight' as const,
      icon: panels.maxHeightShort,
      label: panels.maxHeightShort,
      setLabel: panels.setToCurrentHeight,
      removeLabel: panels.removeMaxHeight
    }
  ]
  const visible = sizeLimits.filter((item) => node[item.prop] != null)

  return (
    <>
      <PanelGrid columns={2}>
        <SizeAxisField axis="width" icon="W" label={panels.width} />
        <SizeAxisField axis="height" icon="H" label={panels.height} />
      </PanelGrid>
      {visible.length > 0 ? (
        <PanelGrid columns={2} className="mt-1.5">
          {visible.map((item) => (
            <Tip key={item.prop} label={item.label}>
              <NumberField
                icon={item.icon}
                aria-label={item.label}
                min={0}
                value={Math.round(node[item.prop] ?? 0)}
                trailing={
                  <select
                    aria-label={item.label}
                    className="flex shrink-0 cursor-pointer items-center self-stretch border-none bg-transparent px-1 text-[10px] text-muted outline-none"
                    defaultValue="VALUE"
                    onChange={(event) => {
                      const value = event.target.value
                      event.target.value = 'VALUE'
                      if (value === 'CURRENT') ctx.setSizeLimitToCurrent(item.prop)
                      else if (value === 'REMOVE') ctx.removeSizeLimit(item.prop)
                    }}
                  >
                    <option value="VALUE" hidden />
                    <option value="CURRENT">{item.setLabel}</option>
                    <option value="REMOVE">{item.removeLabel}</option>
                  </select>
                }
                onCommit={(value, previous) => ctx.commitSizeLimit(item.prop, value, previous)}
              />
            </Tip>
          ))}
        </PanelGrid>
      ) : null}
    </>
  )
}

function SizeAxisField({ axis, icon, label }: { axis: LayoutAxis; icon: string; label: string }) {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const node = ctx.node
  if (!node) return null
  const sizing = axis === 'width' ? ctx.widthSizing : ctx.heightSizing
  const sizingOptions = axis === 'width' ? ctx.widthSizingOptions : ctx.heightSizingOptions
  const limitItems =
    axis === 'width'
      ? [
          { prop: 'minWidth' as const, addLabel: panels.addMinWidth, removeLabel: panels.removeMinWidth },
          { prop: 'maxWidth' as const, addLabel: panels.addMaxWidth, removeLabel: panels.removeMaxWidth }
        ]
      : [
          {
            prop: 'minHeight' as const,
            addLabel: panels.addMinHeight,
            removeLabel: panels.removeMinHeight
          },
          {
            prop: 'maxHeight' as const,
            addLabel: panels.addMaxHeight,
            removeLabel: panels.removeMaxHeight
          }
        ]

  function handleSelect(value: SizeSelectValue) {
    if (value === 'FIXED' || value === 'HUG' || value === 'FILL') {
      ctx.setAxisSizing(axis, value)
      return
    }
    const [action, prop] = value.split('-') as ['add' | 'remove', SizeLimitProp]
    if (action === 'add') ctx.addSizeLimit(prop)
    else ctx.removeSizeLimit(prop)
  }

  return (
    <Tip label={label}>
      <NumberField
        icon={icon}
        aria-label={label}
        min={0}
        value={Math.round(node[axis])}
        trailing={
          <select
            data-slot="sizing-trigger"
            aria-label={label}
            className="flex shrink-0 cursor-pointer items-center gap-0.5 self-stretch border-none bg-transparent px-1.5 text-[10px] text-muted outline-none"
            value={sizing}
            onChange={(event) => handleSelect(event.target.value as SizeSelectValue)}
          >
            {sizingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            {limitItems.map((item) => (
              <option
                key={item.prop}
                value={`${node[item.prop] == null ? 'add' : 'remove'}-${item.prop}`}
              >
                {node[item.prop] == null ? item.addLabel : item.removeLabel}
              </option>
            ))}
          </select>
        }
        onCommit={(value, previous) => ctx.commitAxisSize(axis, value, previous)}
      />
    </Tip>
  )
}
