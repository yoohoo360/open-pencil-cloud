import IconLucideCheck from '~icons/lucide/check'
import IconLucideChevronDown from '~icons/lucide/chevron-down'
import * as Select from '@radix-ui/react-select'
import { memo, useCallback, useMemo } from 'react'

import { useI18n, type SizeLimitProp } from '@open-pencil/react'
import type { LayoutSizing } from '@open-pencil/scene-graph'

import VariableNumberField from '@/components/properties/VariableNumberField'
import { useLayoutContext } from '@/components/properties/LayoutSection/types'
import type { SizeAxisFieldProps } from '@/components/properties/LayoutSection/size/types'
import Tip from '@/components/ui/Tip'
import { useSelectUI } from '@/components/ui/select'

type SizeSelectValue = LayoutSizing | `add-${SizeLimitProp}` | `remove-${SizeLimitProp}`

export const SizeAxisField = memo(function SizeAxisField({ axis, icon, label }: SizeAxisFieldProps) {
  const ctx = useLayoutContext()
  const { panels } = useI18n()
  const selectUI = useSelectUI({ item: 'rounded py-1.5 pr-2 pl-6 text-xs' })

  const sizing = axis === 'width' ? ctx.widthSizing : ctx.heightSizing
  const sizingOptions = axis === 'width' ? ctx.widthSizingOptions : ctx.heightSizingOptions
  const sizingLabel =
    sizing === 'HUG'
      ? panels.sizingHugShort
      : sizing === 'FILL'
        ? panels.sizingFillShort
        : ''

  const limitItems = useMemo(
    () =>
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
          ],
    [
      axis,
      panels.addMaxHeight,
      panels.addMaxWidth,
      panels.addMinHeight,
      panels.addMinWidth,
      panels.removeMaxHeight,
      panels.removeMaxWidth,
      panels.removeMinHeight,
      panels.removeMinWidth
    ]
  )

  const handleSelect = useCallback(
    (value: SizeSelectValue) => {
      if (value === 'FIXED' || value === 'HUG' || value === 'FILL') {
        ctx.setAxisSizing(axis, value)
        return
      }

      const [action, prop] = value.split('-') as ['add' | 'remove', SizeLimitProp]
      if (action === 'add') ctx.addSizeLimit(prop)
      else ctx.removeSizeLimit(prop)
    },
    [axis, ctx]
  )

  const sizingMenu = (
    <Select.Root value={sizing} onValueChange={(value) => handleSelect(value as SizeSelectValue)}>
      <Select.Trigger
        data-slot="sizing-trigger"
        aria-label={label}
        className="flex shrink-0 cursor-pointer items-center gap-0.5 self-stretch border-none bg-transparent px-1.5 text-[10px] text-muted outline-none data-[state=open]:text-foreground"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {sizingLabel ? <span>{sizingLabel}</span> : null}
        <IconLucideChevronDown className="size-3" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" align="start" sideOffset={4} className={selectUI.content}>
          <Select.Viewport className="p-0.5">
            {sizingOptions.map((option) => (
              <Select.Item key={option.value} value={option.value} className={selectUI.item}>
                <Select.ItemIndicator className="absolute left-1.5 inline-flex items-center justify-center">
                  <IconLucideCheck className="size-3 text-accent" />
                </Select.ItemIndicator>
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
            {limitItems.map((item) => (
              <Select.Item
                key={item.prop}
                value={`${ctx.node[item.prop] == null ? 'add' : 'remove'}-${item.prop}`}
                className={selectUI.item}
              >
                <Select.ItemText>
                  {ctx.node[item.prop] == null ? item.addLabel : item.removeLabel}
                </Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )

  return (
    <Tip label={label}>
      <VariableNumberField
        icon={icon}
        aria-label={label}
        value={Math.round(ctx.node[axis])}
        min={0}
        nodeId={ctx.node.id}
        bindingPath={axis}
        afterVariable={sizingMenu}
        onValueChange={(value) => ctx.updateAxisSize(axis, value)}
        onCommit={(value, previous) => ctx.commitAxisSize(axis, value, previous)}
      />
    </Tip>
  )
})

SizeAxisField.displayName = 'SizeAxisField'
export default SizeAxisField
