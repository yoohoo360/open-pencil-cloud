import IconLucideAlignHorizontalSpaceBetween from '~icons/lucide/align-horizontal-space-between'
import IconLucideAlignVerticalSpaceBetween from '~icons/lucide/align-vertical-space-between'
import IconLucideCheck from '~icons/lucide/check'
import IconLucideChevronDown from '~icons/lucide/chevron-down'
import IconLucideMinus from '~icons/lucide/minus'
import IconLucidePlus from '~icons/lucide/plus'
import * as Select from '@radix-ui/react-select'
import { memo, useCallback, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import { useI18n } from '@open-pencil/react'
import type { LayoutAlign, LayoutDirection } from '@open-pencil/scene-graph'

import VariableNumberField from '@/components/properties/VariableNumberField'
import ClipContentControl from '@/components/properties/LayoutSection/ClipContentControl'
import PaddingControls from '@/components/properties/LayoutSection/PaddingControls'
import { useLayoutContext } from '@/components/properties/LayoutSection/types'
import AppSelect from '@/components/ui/AppSelect'
import { useSelectUI } from '@/components/ui/select'
import layoutAlignmentTheme from '@/theme/layout-alignment'

export const FlexControls = memo(function FlexControls() {
  const ctx = useLayoutContext()
  const { panels } = useI18n()
  const layoutAlignment = useMemo(() => tv(layoutAlignmentTheme), [])
  const alignmentStyles = useMemo(() => layoutAlignment(), [layoutAlignment])
  const gapSelect = useSelectUI({ item: 'rounded py-1.5 pr-2 pl-6 text-xs' })

  const setGapMode = useCallback(
    (value: string) => {
      ctx.setGapAuto(value === 'AUTO')
    },
    [ctx]
  )

  const isAlignmentActive = useCallback(
    (primary: LayoutAlign, counter: string) => {
      if (ctx.gapAuto) {
        return ctx.node.primaryAxisAlign === 'SPACE_BETWEEN' && ctx.node.counterAxisAlign === counter
      }
      return ctx.node.primaryAxisAlign === primary && ctx.node.counterAxisAlign === counter
    },
    [ctx.gapAuto, ctx.node.counterAxisAlign, ctx.node.primaryAxisAlign]
  )

  const alignmentCellClass = useCallback(
    (primary: LayoutAlign, counter: string) =>
      layoutAlignment({ active: isAlignmentActive(primary, counter) }).cell(),
    [isAlignmentActive, layoutAlignment]
  )

  const gapIcon =
    ctx.node.layoutMode === 'VERTICAL' ? (
      <IconLucideAlignVerticalSpaceBetween className="size-3.5" />
    ) : (
      <IconLucideAlignHorizontalSpaceBetween className="size-3.5" />
    )

  const crossGapIcon =
    ctx.node.layoutMode === 'VERTICAL' ? (
      <IconLucideAlignHorizontalSpaceBetween className="size-3.5" />
    ) : (
      <IconLucideAlignVerticalSpaceBetween className="size-3.5" />
    )

  const gapMenu = (value: 'AUTO' | 'FIXED') => (
    <Select.Root value={value} onValueChange={setGapMode}>
      <Select.Trigger
        data-test-id="layout-gap-menu"
        className="flex shrink-0 cursor-pointer items-center self-stretch border-none bg-transparent px-1 text-[11px] text-muted outline-none"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <IconLucideChevronDown className="size-3" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          align="start"
          sideOffset={4}
          className={gapSelect.content}
        >
          <Select.Viewport className="p-0.5">
            <Select.Item value="FIXED" className={gapSelect.item}>
              {value === 'FIXED' ? (
                <Select.ItemIndicator className="absolute left-1.5 inline-flex items-center justify-center">
                  <IconLucideCheck className="size-3 text-accent" />
                </Select.ItemIndicator>
              ) : null}
              <Select.ItemText>{Math.round(ctx.node.itemSpacing)}</Select.ItemText>
            </Select.Item>
            <Select.Item value="AUTO" className={gapSelect.item}>
              {value === 'AUTO' ? (
                <Select.ItemIndicator className="absolute left-1.5 inline-flex items-center justify-center">
                  <IconLucideCheck className="size-3 text-accent" />
                </Select.ItemIndicator>
              ) : null}
              <Select.ItemText>{panels.auto}</Select.ItemText>
            </Select.Item>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )

  return (
    <>
      <div className="mt-2">
        <label className="mb-1 block text-[11px] text-muted">{panels.flow}</label>
        <AppSelect
          value={ctx.layoutDirection}
          options={[
            { value: 'AUTO', label: panels.auto },
            { value: 'LTR', label: 'LTR' },
            { value: 'RTL', label: 'RTL' }
          ]}
          onValueChange={(value) => ctx.setLayoutDirection(value as LayoutDirection)}
        />
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        {ctx.node.layoutWrap === 'WRAP' ? (
          <>
            <VariableNumberField
              data-test-id="layout-gap-input"
              className="min-w-0 flex-1"
              label={ctx.node.layoutMode === 'VERTICAL' ? panels.verticalGap : panels.horizontalGap}
              value={Math.round(ctx.node.itemSpacing)}
              min={0}
              nodeId={ctx.node.id}
              bindingPath="itemSpacing"
              icon={gapIcon}
              onValueChange={(value) => ctx.updateProp('itemSpacing', value)}
              onCommit={(value, previous) => ctx.commitProp('itemSpacing', value, previous)}
            />
            <VariableNumberField
              data-test-id="layout-cross-gap-input"
              className="min-w-0 flex-1"
              label={ctx.node.layoutMode === 'VERTICAL' ? panels.horizontalGap : panels.verticalGap}
              value={Math.round(ctx.node.counterAxisSpacing)}
              min={0}
              nodeId={ctx.node.id}
              bindingPath="counterAxisSpacing"
              icon={crossGapIcon}
              onValueChange={(value) => ctx.updateProp('counterAxisSpacing', value)}
              onCommit={(value, previous) => ctx.commitProp('counterAxisSpacing', value, previous)}
            />
          </>
        ) : ctx.gapAuto ? (
          <div
            data-test-id="layout-gap-input"
            className="group flex h-[26px] min-w-0 flex-1 items-center rounded border border-border bg-input focus-within:border-accent"
          >
            <span className="flex shrink-0 items-center justify-center self-stretch px-[5px] text-muted">
              {gapIcon}
            </span>
            <span className="flex-1 truncate text-xs text-surface">{panels.auto}</span>
            {gapMenu('AUTO')}
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <VariableNumberField
              data-test-id="layout-gap-input"
              className="w-full"
              value={Math.round(ctx.node.itemSpacing)}
              min={0}
              nodeId={ctx.node.id}
              bindingPath="itemSpacing"
              icon={gapIcon}
              afterVariable={gapMenu('FIXED')}
              onValueChange={(value) => ctx.updateProp('itemSpacing', value)}
              onCommit={(value, previous) => ctx.commitProp('itemSpacing', value, previous)}
            />
          </div>
        )}
        <button
          type="button"
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded border border-border bg-transparent text-muted hover:bg-hover hover:text-surface"
          onClick={ctx.toggleIndividualPadding}
        >
          {ctx.showIndividualPadding || !ctx.hasUniformPadding ? (
            <IconLucideMinus className="size-3" />
          ) : (
            <IconLucidePlus className="size-3" />
          )}
        </button>
      </div>

      <PaddingControls />
      <ClipContentControl />

      <div className="mt-2">
        <label className="mb-1 block text-[11px] text-muted">{panels.alignment}</label>
        <div data-test-id="layout-alignment-grid" className={alignmentStyles.grid()}>
          {ctx.alignGrid.map((cell) => (
            <button
              key={`${cell.primary}-${cell.counter}`}
              type="button"
              data-active={isAlignmentActive(cell.primary, cell.counter) ? '' : undefined}
              className={alignmentCellClass(cell.primary, cell.counter)}
              onClick={() =>
                ctx.setAlignment(ctx.gapAuto ? 'SPACE_BETWEEN' : cell.primary, cell.counter)
              }
            >
              <span className={alignmentStyles.dot()} />
            </button>
          ))}
        </div>
      </div>
    </>
  )
})

FlexControls.displayName = 'FlexControls'
export default FlexControls
