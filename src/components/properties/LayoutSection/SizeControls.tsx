import { useRef } from 'react'
import IconArrowRightFromLine from '~icons/lucide/arrow-right-from-line'
import IconListChevronsUpDown from '~icons/lucide/list-chevrons-up-down'
import IconSquareChartGantt from '~icons/lucide/square-chart-gantt'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconCheck from '~icons/lucide/check'

import { SelectContent, SelectItem, SelectItemIndicator, SelectItemText, SelectPortal, Root as SelectRoot, SelectTrigger, SelectViewport } from '@radix-ui/react-select'

import { useI18n, useLayoutControlsContext } from '@open-pencil/react'
import type { LayoutSizing } from '@open-pencil/scene-graph'
import type { SizeLimitProp } from '@open-pencil/react'
import { IconButton } from '@/components/ui/IconButton'
import { PanelRow } from '@/components/ui/panel/PanelRow'
import { VariableNumberField } from '@/components/properties/VariableNumberField'
import { useSelectUI } from '@/components/ui/select'
import { Tip } from '@/components/ui/Tip'

type SizeSelectValue = LayoutSizing | `add-${SizeLimitProp}` | `remove-${SizeLimitProp}`

export function SizeControls() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const sizingSelect = useSelectUI({ item: 'rounded py-1.5 pr-2 pl-6 text-xs' })
  const widthFieldRef = useRef<HTMLDivElement>(null)
  const heightFieldRef = useRef<HTMLDivElement>(null)
  const node = ctx.node.value
  if (!node) return null

  const widthLimitItems = [
    { prop: 'minWidth' as SizeLimitProp, addLabel: () => panels.addMinWidth, removeLabel: () => panels.removeMinWidth },
    { prop: 'maxWidth' as SizeLimitProp, addLabel: () => panels.addMaxWidth, removeLabel: () => panels.removeMaxWidth }
  ]
  const heightLimitItems = [
    { prop: 'minHeight' as SizeLimitProp, addLabel: () => panels.addMinHeight, removeLabel: () => panels.removeMinHeight },
    { prop: 'maxHeight' as SizeLimitProp, addLabel: () => panels.addMaxHeight, removeLabel: () => panels.removeMaxHeight }
  ]

  const activeSizeLimits = [
    { prop: 'minWidth' as SizeLimitProp, testHook: 'layout-min-width-input', icon: () => panels.minWidthShort, value: () => node.minWidth, setLabel: () => panels.setToCurrentWidth, removeLabel: () => panels.removeMinWidth },
    { prop: 'maxWidth' as SizeLimitProp, testHook: 'layout-max-width-input', icon: () => panels.maxWidthShort, value: () => node.maxWidth, setLabel: () => panels.setToCurrentWidth, removeLabel: () => panels.removeMaxWidth },
    { prop: 'minHeight' as SizeLimitProp, testHook: 'layout-min-height-input', icon: () => panels.minHeightShort, value: () => node.minHeight, setLabel: () => panels.setToCurrentHeight, removeLabel: () => panels.removeMinHeight },
    { prop: 'maxHeight' as SizeLimitProp, testHook: 'layout-max-height-input', icon: () => panels.maxHeightShort, value: () => node.maxHeight, setLabel: () => panels.setToCurrentHeight, removeLabel: () => panels.removeMaxHeight }
  ]

  const visibleSizeLimits = activeSizeLimits.filter((item) => item.value() != null)

  function handleSizeSelect(axis: 'width' | 'height', value: SizeSelectValue) {
    if (value === 'FIXED' || value === 'HUG' || value === 'FILL') {
      if (axis === 'width') ctx.setWidthSizing(value)
      else ctx.setHeightSizing(value)
      return
    }
    const [action, prop] = value.split('-') as ['add' | 'remove', SizeLimitProp]
    if (action === 'add') ctx.addSizeLimit(prop)
    else ctx.removeSizeLimit(prop)
  }

  function handleLimitSelect(prop: SizeLimitProp, value: string) {
    if (value === 'CURRENT') ctx.setSizeLimitToCurrent(prop)
    else if (value === 'REMOVE') ctx.removeSizeLimit(prop)
  }

  function handleAutoTextSizeSelect(val: 'NONE' | 'HEIGHT' | 'WIDTH_AND_HEIGHT') {
    ctx.setTextAutoResize(val)
  }

  function SizingDropdown({ axis }: { axis: 'width' | 'height' }) {
    const sizing = axis === 'width' ? ctx.widthSizing.value : ctx.heightSizing.value
    const options = axis === 'width' ? ctx.widthSizingOptions.value : ctx.heightSizingOptions.value
    const limitItems = axis === 'width' ? widthLimitItems : heightLimitItems
    const testId = `layout-${axis}-sizing-menu`

    return (
      <SelectRoot value={sizing} onValueChange={(v) => handleSizeSelect(axis, v as SizeSelectValue)}>
        <SelectTrigger
          data-test-id={testId}
          className="flex shrink-0 cursor-pointer items-center justify-center self-stretch border-none bg-transparent px-1.5 text-[11px] text-muted outline-none"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <IconChevronDown className="size-3" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent position="popper" align="start" sideOffset={4} className={sizingSelect.content}>
            <SelectViewport className="p-0.5">
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className={sizingSelect.item}>
                  <SelectItemIndicator className="absolute left-1.5 inline-flex items-center justify-center">
                    <IconCheck className="size-3 text-accent" />
                  </SelectItemIndicator>
                  <SelectItemText>{opt.label}</SelectItemText>
                </SelectItem>
              ))}
              {limitItems.map((item) => (
                <SelectItem
                  key={item.prop}
                  value={`${node[item.prop] == null ? 'add' : 'remove'}-${item.prop}`}
                  className={sizingSelect.item}
                >
                  <SelectItemText>
                    {node[item.prop] == null ? item.addLabel() : item.removeLabel()}
                  </SelectItemText>
                </SelectItem>
              ))}
            </SelectViewport>
          </SelectContent>
        </SelectPortal>
      </SelectRoot>
    )
  }

  return (
    <>
      {node.type === 'TEXT' && (
        <PanelRow gap="sm" className="mb-1.5">
          <IconButton
            label={panels.textAutoWidth}
            size="md"
            active={node.textAutoResize === 'WIDTH_AND_HEIGHT'}
            onClick={() => handleAutoTextSizeSelect('WIDTH_AND_HEIGHT')}
          >
            <IconArrowRightFromLine className="size-3.5" />
          </IconButton>
          <IconButton
            label={panels.textAutoHeight}
            size="md"
            active={node.textAutoResize === 'HEIGHT'}
            onClick={() => handleAutoTextSizeSelect('HEIGHT')}
          >
            <IconListChevronsUpDown className="size-3.5" />
          </IconButton>
          <IconButton
            label={panels.textFixedSize}
            size="md"
            active={node.textAutoResize === 'NONE'}
            onClick={() => handleAutoTextSizeSelect('NONE')}
          >
            <IconSquareChartGantt className="size-3.5" />
          </IconButton>
        </PanelRow>
      )}

      <div className="flex gap-1.5">
        <div ref={widthFieldRef} className="min-w-0 flex-1">
          <Tip label={panels.width}>
            <VariableNumberField
              data-test-id="layout-width-input"
              value={Math.round(node.width)}
              min={0}
              nodeId={node.id}
              bindingPath="width"
              icon="W"
              afterVariable={<SizingDropdown axis="width" />}
              onChange={(v) => ctx.updateProp('width', v)}
              onCommit={(v, p) => ctx.commitProp('width', v, p)}
            />
          </Tip>
        </div>
        <div ref={heightFieldRef} className="min-w-0 flex-1">
          <Tip label={panels.height}>
            <VariableNumberField
              data-test-id="layout-height-input"
              value={Math.round(node.height)}
              min={0}
              nodeId={node.id}
              bindingPath="height"
              icon="H"
              afterVariable={<SizingDropdown axis="height" />}
              onChange={(v) => ctx.updateProp('height', v)}
              onCommit={(v, p) => ctx.commitProp('height', v, p)}
            />
          </Tip>
        </div>
      </div>

      {visibleSizeLimits.length > 0 && (
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {visibleSizeLimits.map((item) => (
            <div key={item.prop} className="min-w-0">
              <VariableNumberField
                data-test-id={item.testHook}
                icon={item.icon()}
                value={Math.round(item.value() ?? 0)}
                min={0}
                nodeId={node.id}
                bindingPath={item.prop}
                afterVariable={
                  <SelectRoot value="VALUE" onValueChange={(v) => handleLimitSelect(item.prop, v)}>
                    <SelectTrigger
                      data-test-id={`${item.testHook}-menu`}
                      className="flex shrink-0 cursor-pointer items-center self-stretch border-none bg-transparent px-1 text-[11px] text-muted outline-none"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <IconChevronDown className="size-3" />
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectContent position="popper" align="start" sideOffset={4} className={sizingSelect.content}>
                        <SelectViewport className="p-0.5">
                          <SelectItem value="CURRENT" className={sizingSelect.item}>
                            <SelectItemText>{item.setLabel()}</SelectItemText>
                          </SelectItem>
                          <SelectItem value="REMOVE" className={sizingSelect.item}>
                            <SelectItemText>{item.removeLabel()}</SelectItemText>
                          </SelectItem>
                        </SelectViewport>
                      </SelectContent>
                    </SelectPortal>
                  </SelectRoot>
                }
                onChange={(v) => ctx.updateSizeLimit(item.prop, v)}
                onCommit={(v, p) => ctx.commitSizeLimit(item.prop, v, p)}
              />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
