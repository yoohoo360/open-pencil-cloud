import {
  Columns2,
  LayoutGrid,
  LayoutPanelTop,
  Move,
  Rows2,
  WrapText
} from 'lucide-react'
import type { LayoutMode } from '@open-pencil/scene-graph'

import { IconButton } from '#react/components/ui/IconButton'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { SegmentedControl } from '#react/components/ui/SegmentedControl'
import { Tip } from '#react/components/ui/Tip'
import {
  LayoutControlsProvider,
  useLayout,
  useLayoutControlsContext
} from '#react/controls/layout/use'
import { ClipContentControl } from '#react/components/properties/LayoutSection/ClipContentControl'
import { FlexControls } from '#react/components/properties/LayoutSection/FlexControls'
import { GridControls } from '#react/components/properties/LayoutSection/GridControls'
import { PaddingControls } from '#react/components/properties/LayoutSection/PaddingControls'
import { SizeControls } from '#react/components/properties/LayoutSection/SizeControls'
import { TextResizingControl } from '#react/components/properties/LayoutSection/TextResizingControl'
import { useI18n } from '#react/i18n'

const CONTAINER_TYPES = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE'])

export function LayoutSection() {
  const layout = useLayout()
  if (!layout.node) return null
  return (
    <LayoutControlsProvider value={layout}>
      <LayoutSectionBody />
    </LayoutControlsProvider>
  )
}

function LayoutSectionBody() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const node = ctx.node
  if (!node) return null
  const isContainer = CONTAINER_TYPES.has(node.type)

  return (
    <PanelSection label={node.layoutMode === 'NONE' ? panels.layout : panels.autoLayout} actions={
      isContainer ? (
        <IconButton
          label={node.layoutMode === 'NONE' ? panels.addAutoLayout : panels.removeAutoLayout}
          size="xs"
          active={node.layoutMode !== 'NONE'}
          className="data-[state=on]:bg-accent/15"
          onClick={() =>
            ctx.editor.setLayoutMode(node.id, node.layoutMode === 'NONE' ? 'VERTICAL' : 'NONE')
          }
        >
          <LayoutPanelTop className="size-3.5" />
        </IconButton>
      ) : undefined
    }>
      {isContainer ? <AutoLayoutControls /> : null}
      <div className="mt-2 mb-1 text-[11px] text-muted">{panels.dimensions}</div>
      {node.type === 'TEXT' ? <TextResizingControl /> : null}
      <SizeControls />
      {isContainer && node.layoutMode === 'NONE' ? <ClipContentControl /> : null}
      {isContainer && node.layoutMode !== 'NONE' ? (
        <>
          {ctx.isFlex ? <FlexControls /> : null}
          {ctx.isGrid ? (
            <>
              <GridControls />
              <PaddingControls />
              <ClipContentControl />
            </>
          ) : null}
        </>
      ) : null}
    </PanelSection>
  )
}

function AutoLayoutControls() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const node = ctx.node
  if (!node) return null

  const layoutModes: Array<{ value: LayoutMode; label: string }> = [
    { value: 'NONE', label: panels.freeform },
    { value: 'VERTICAL', label: panels.layoutVertical },
    { value: 'HORIZONTAL', label: panels.layoutHorizontal },
    { value: 'GRID', label: panels.layoutGrid }
  ]

  return (
    <div>
      <label className="mb-1 block text-[11px] text-muted">{panels.flow}</label>
      <div className="flex items-center gap-1.5">
        <SegmentedControl
          value={node.layoutMode}
          options={layoutModes}
          label={panels.flow}
          ui={{ root: 'flex min-w-0 flex-1' }}
          onChange={(mode) => ctx.editor.setLayoutMode(node.id, mode as LayoutMode)}
          renderOption={(option) => (
            <Tip label={option.label}>
              <span className="flex items-center justify-center">
                {option.value === 'NONE' ? <Move className="size-3.5" /> : null}
                {option.value === 'VERTICAL' ? <Rows2 className="size-3.5" /> : null}
                {option.value === 'HORIZONTAL' ? <Columns2 className="size-3.5" /> : null}
                {option.value === 'GRID' ? <LayoutGrid className="size-3.5" /> : null}
              </span>
            </Tip>
          )}
        />
        {ctx.isFlex ? (
          <IconButton
            label={panels.layoutWrap}
            size="xs"
            active={node.layoutWrap === 'WRAP'}
            onClick={() =>
              ctx.editor.updateNodeWithUndo(
                node.id,
                { layoutWrap: node.layoutWrap === 'WRAP' ? 'NO_WRAP' : 'WRAP' },
                'Toggle wrap'
              )
            }
          >
            <WrapText className="size-3.5" />
          </IconButton>
        ) : null}
      </div>
    </div>
  )
}
