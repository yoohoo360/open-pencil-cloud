import { useRef } from 'react'
import IconAlignVerticalSpaceBetween from '~icons/lucide/align-vertical-space-between'
import IconAlignHorizontalSpaceBetween from '~icons/lucide/align-horizontal-space-between'
import IconCheck from '~icons/lucide/check'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconPlus from '~icons/lucide/plus'
import IconMinus from '~icons/lucide/minus'

import { SelectContent, SelectItem, SelectItemIndicator, SelectItemText, SelectPortal, Root as SelectRoot, SelectTrigger, SelectViewport } from '@radix-ui/react-select'

import { useI18n, useLayoutControlsContext } from '@open-pencil/react'
import type { LayoutDirection } from '@open-pencil/scene-graph'
import { AppSelect } from '@/components/ui/AppSelect'
import { VariableNumberField } from '@/components/properties/VariableNumberField'
import { ClipContentControl } from '@/components/properties/LayoutSection/ClipContentControl'
import { PaddingControls } from '@/components/properties/LayoutSection/PaddingControls'
import { useSelectUI } from '@/components/ui/select'

export function FlexControls() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const gapSelectCls = useSelectUI({ item: 'rounded py-1.5 pr-2 pl-6 text-xs' })
  const gapFieldRef = useRef<HTMLDivElement>(null)
  const node = ctx.node.value
  if (!node) return null

  const isVertical = node.layoutMode === 'VERTICAL'

  function setGapMode(value: string) {
    ctx.setGapAuto(value === 'AUTO')
  }

  function isAlignmentActive(primary: string, counter: string) {
    if (ctx.gapAuto.value)
      return node.primaryAxisAlign === 'SPACE_BETWEEN' && node.counterAxisAlign === counter
    return node.primaryAxisAlign === primary && node.counterAxisAlign === counter
  }

  return (
    <>
      <div className="mt-2">
        <label className="mb-1 block text-[11px] text-muted">{panels.flow}</label>
        <AppSelect
          value={ctx.layoutDirection.value}
          options={[
            { value: 'AUTO', label: panels.auto },
            { value: 'LTR', label: 'LTR' },
            { value: 'RTL', label: 'RTL' }
          ]}
          onChange={(v) => ctx.setLayoutDirection(v as LayoutDirection)}
        />
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        {node.layoutWrap === 'WRAP' ? (
          <>
            <VariableNumberField
              data-test-id="layout-gap-input"
              className="min-w-0 flex-1"
              label={isVertical ? panels.verticalGap : panels.horizontalGap}
              value={Math.round(node.itemSpacing)}
              min={0}
              nodeId={node.id}
              bindingPath="itemSpacing"
              iconSlot={isVertical
                ? <IconAlignVerticalSpaceBetween className="size-3.5" />
                : <IconAlignHorizontalSpaceBetween className="size-3.5" />
              }
              onChange={(v) => ctx.updateProp('itemSpacing', v)}
              onCommit={(v, p) => ctx.commitProp('itemSpacing', v, p)}
            />
            <VariableNumberField
              data-test-id="layout-cross-gap-input"
              className="min-w-0 flex-1"
              label={isVertical ? panels.horizontalGap : panels.verticalGap}
              value={Math.round(node.counterAxisSpacing)}
              min={0}
              nodeId={node.id}
              bindingPath="counterAxisSpacing"
              iconSlot={isVertical
                ? <IconAlignHorizontalSpaceBetween className="size-3.5" />
                : <IconAlignVerticalSpaceBetween className="size-3.5" />
              }
              onChange={(v) => ctx.updateProp('counterAxisSpacing', v)}
              onCommit={(v, p) => ctx.commitProp('counterAxisSpacing', v, p)}
            />
          </>
        ) : (ctx.gapAuto.value ? (
          <div
            ref={gapFieldRef}
            data-test-id="layout-gap-input"
            className="group flex h-[26px] min-w-0 flex-1 items-center rounded border border-border bg-input focus-within:border-accent"
          >
            <span className="flex shrink-0 items-center justify-center self-stretch px-[5px] text-muted">
              {isVertical
                ? <IconAlignVerticalSpaceBetween className="size-3.5" />
                : <IconAlignHorizontalSpaceBetween className="size-3.5" />
              }
            </span>
            <span className="flex-1 truncate text-xs text-surface">{panels.auto}</span>
            <SelectRoot value="AUTO" onValueChange={setGapMode}>
              <SelectTrigger
                data-test-id="layout-gap-menu"
                className="flex shrink-0 cursor-pointer items-center self-stretch border-none bg-transparent px-1 text-[11px] text-muted outline-none"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <IconChevronDown className="size-3" />
              </SelectTrigger>
              <SelectPortal>
                <SelectContent
                  position="popper"
                  align="start"
                  sideOffset={4}
                  className={gapSelectCls.content}
                >
                  <SelectViewport className="p-0.5">
                    <SelectItem value="FIXED" className={gapSelectCls.item}>
                      <SelectItemText>{Math.round(node.itemSpacing)}</SelectItemText>
                    </SelectItem>
                    <SelectItem value="AUTO" className={gapSelectCls.item}>
                      <SelectItemIndicator className="absolute left-1.5 inline-flex items-center justify-center">
                        <IconCheck className="size-3 text-accent" />
                      </SelectItemIndicator>
                      <SelectItemText>{panels.auto}</SelectItemText>
                    </SelectItem>
                  </SelectViewport>
                </SelectContent>
              </SelectPortal>
            </SelectRoot>
          </div>
        ) : (
          <div ref={gapFieldRef} className="min-w-0 flex-1">
            <VariableNumberField
              data-test-id="layout-gap-input"
              className="w-full"
              value={Math.round(node.itemSpacing)}
              min={0}
              nodeId={node.id}
              bindingPath="itemSpacing"
              iconSlot={isVertical
                ? <IconAlignVerticalSpaceBetween className="size-3.5" />
                : <IconAlignHorizontalSpaceBetween className="size-3.5" />
              }
              afterVariable={
                <SelectRoot value="FIXED" onValueChange={setGapMode}>
                  <SelectTrigger
                    data-test-id="layout-gap-menu"
                    className="flex shrink-0 cursor-pointer items-center self-stretch border-none bg-transparent px-1 text-[11px] text-muted outline-none"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <IconChevronDown className="size-3" />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectContent
                      position="popper"
                      align="start"
                      sideOffset={4}
                      className={gapSelectCls.content}
                    >
                      <SelectViewport className="p-0.5">
                        <SelectItem value="FIXED" className={gapSelectCls.item}>
                          <SelectItemIndicator className="absolute left-1.5 inline-flex items-center justify-center">
                            <IconCheck className="size-3 text-accent" />
                          </SelectItemIndicator>
                          <SelectItemText>{Math.round(node.itemSpacing)}</SelectItemText>
                        </SelectItem>
                        <SelectItem value="AUTO" className={gapSelectCls.item}>
                          <SelectItemText>{panels.auto}</SelectItemText>
                        </SelectItem>
                      </SelectViewport>
                    </SelectContent>
                  </SelectPortal>
                </SelectRoot>
              }
              onChange={(v) => ctx.updateProp('itemSpacing', v)}
              onCommit={(v, p) => ctx.commitProp('itemSpacing', v, p)}
            />
          </div>
        ))}
        <button
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded border border-border bg-transparent text-muted hover:bg-hover hover:text-surface"
          onClick={ctx.toggleIndividualPadding}
        >
          {ctx.showIndividualPadding.value || !ctx.hasUniformPadding.value
            ? <IconMinus className="size-3" />
            : <IconPlus className="size-3" />
          }
        </button>
      </div>

      <PaddingControls />
      <ClipContentControl />

      <div className="mt-2">
        <label className="mb-1 block text-[11px] text-muted">{panels.alignment}</label>
        <div data-test-id="layout-alignment-grid" className="grid w-fit grid-cols-3 gap-0.5">
          {ctx.alignGrid.map((cell, i) => (
            <button
              key={i}
              className={`flex size-6 cursor-pointer items-center justify-center rounded border text-[11px] ${
                isAlignmentActive(cell.primary, cell.counter)
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted hover:bg-hover hover:text-surface'
              }`}
              onClick={() =>
                ctx.setAlignment(
                  ctx.gapAuto.value ? 'SPACE_BETWEEN' : cell.primary,
                  cell.counter
                )
              }
            >
              <span className="size-1.5 rounded-full bg-current" />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
