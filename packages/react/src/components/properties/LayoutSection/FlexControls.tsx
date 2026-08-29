import { tv } from 'tailwind-variants'
import {
  AlignHorizontalSpaceBetween,
  AlignVerticalSpaceBetween
} from 'lucide-react'
import type { LayoutAlign, LayoutDirection } from '@open-pencil/scene-graph'

import { NumberField } from '#react/components/inputs/NumberField'
import { AppSelect } from '#react/components/ui/AppSelect'
import {
  ClipContentControl
} from '#react/components/properties/LayoutSection/ClipContentControl'
import {
  PaddingControls,
  PaddingToggleButton
} from '#react/components/properties/LayoutSection/PaddingControls'
import { useLayoutControlsContext } from '#react/controls/layout/use'
import { useI18n } from '#react/i18n'
import layoutAlignmentTheme from '#react/theme/layout-alignment'

export function FlexControls() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const node = ctx.node
  if (!node) return null
  const layoutAlignment = tv(layoutAlignmentTheme)
  const alignmentStyles = layoutAlignment()
  const GapIcon =
    node.layoutMode === 'VERTICAL' ? AlignVerticalSpaceBetween : AlignHorizontalSpaceBetween
  const CrossGapIcon =
    node.layoutMode === 'VERTICAL' ? AlignHorizontalSpaceBetween : AlignVerticalSpaceBetween

  function isAlignmentActive(primary: LayoutAlign, counter: string) {
    if (ctx.gapAuto) {
      return node.primaryAxisAlign === 'SPACE_BETWEEN' && node.counterAxisAlign === counter
    }
    return node.primaryAxisAlign === primary && node.counterAxisAlign === counter
  }

  return (
    <>
      <div className="mt-2">
        <label className="mb-1 block text-[11px] text-muted">{panels.direction}</label>
        <AppSelect
          value={ctx.layoutDirection}
          options={[
            { value: 'AUTO', label: panels.auto },
            { value: 'LTR', label: 'LTR' },
            { value: 'RTL', label: 'RTL' }
          ]}
          onChange={(value) => ctx.setLayoutDirection(value as LayoutDirection)}
        />
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        {node.layoutWrap === 'WRAP' ? (
          <>
            <NumberField
              min={0}
              value={Math.round(node.itemSpacing)}
              icon={<GapIcon className="size-3.5" />}
              onCommit={(value, previous) => ctx.commitProp('itemSpacing', value, previous)}
            />
            <NumberField
              min={0}
              value={Math.round(node.counterAxisSpacing)}
              icon={<CrossGapIcon className="size-3.5" />}
              onCommit={(value, previous) => ctx.commitProp('counterAxisSpacing', value, previous)}
            />
          </>
        ) : (
          <NumberField
            min={0}
            value={Math.round(node.itemSpacing)}
            icon={<GapIcon className="size-3.5" />}
            trailing={
              <select
                aria-label={panels.gap}
                className="flex shrink-0 cursor-pointer self-stretch border-none bg-transparent px-1 text-[11px] text-muted outline-none"
                value={ctx.gapAuto ? 'AUTO' : 'FIXED'}
                onChange={(event) => ctx.setGapAuto(event.target.value === 'AUTO')}
              >
                <option value="FIXED">{Math.round(node.itemSpacing)}</option>
                <option value="AUTO">{panels.auto}</option>
              </select>
            }
            onCommit={(value, previous) => {
              if (ctx.gapAuto) ctx.setGapAuto(false)
              ctx.commitProp('itemSpacing', value, previous)
            }}
          />
        )}
        <PaddingToggleButton />
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
              data-active={isAlignmentActive(cell.primary, cell.counter) || undefined}
              className={layoutAlignment({
                active: isAlignmentActive(cell.primary, cell.counter)
              }).cell()}
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
}
