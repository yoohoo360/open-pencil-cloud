import IconLucideChevronDown from '~icons/lucide/chevron-down'
import * as Select from '@radix-ui/react-select'
import { memo, useCallback } from 'react'

import VariableNumberField from '@/components/properties/VariableNumberField'
import { useLayoutContext } from '@/components/properties/LayoutSection/types'
import type { SizeLimitFieldProps } from '@/components/properties/LayoutSection/size/types'
import { useSelectUI } from '@/components/ui/select'
import Tip from '@/components/ui/Tip'

export const SizeLimitField = memo(function SizeLimitField({ item }: SizeLimitFieldProps) {
  const ctx = useLayoutContext()
  const selectUI = useSelectUI({ item: 'rounded py-1.5 px-2 text-xs' })

  const handleSelect = useCallback(
    (value: string) => {
      if (value === 'CURRENT') ctx.setSizeLimitToCurrent(item.prop)
      else if (value === 'REMOVE') ctx.removeSizeLimit(item.prop)
    },
    [ctx, item.prop]
  )

  const limitMenu = (
    <Select.Root value="VALUE" onValueChange={handleSelect}>
      <Select.Trigger
        data-slot="limit-trigger"
        aria-label={item.label}
        className="flex shrink-0 cursor-pointer items-center self-stretch border-none bg-transparent px-1 text-muted outline-none data-[state=open]:text-foreground"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <IconLucideChevronDown className="size-3" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" align="start" sideOffset={4} className={selectUI.content}>
          <Select.Viewport className="p-0.5">
            <Select.Item value="CURRENT" className={selectUI.item}>
              <Select.ItemText>{item.setLabel}</Select.ItemText>
            </Select.Item>
            <Select.Item value="REMOVE" className={selectUI.item}>
              <Select.ItemText>{item.removeLabel}</Select.ItemText>
            </Select.Item>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )

  return (
    <Tip label={item.label}>
      <VariableNumberField
        icon={item.icon}
        aria-label={item.label}
        value={Math.round(ctx.node[item.prop] ?? 0)}
        min={0}
        nodeId={ctx.node.id}
        bindingPath={item.prop}
        afterVariable={limitMenu}
        onValueChange={(value) => ctx.updateSizeLimit(item.prop, value)}
        onCommit={(value, previous) => ctx.commitSizeLimit(item.prop, value, previous)}
      />
    </Tip>
  )
})

SizeLimitField.displayName = 'SizeLimitField'
export default SizeLimitField
