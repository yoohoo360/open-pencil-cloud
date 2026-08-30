import { NumberField } from '#react/components/inputs/NumberField'
import { SharedStyleField } from '#react/components/properties/shared-style/SharedStyleField'
import { IconButton } from '#react/components/ui/IconButton'
import { PanelFieldGroup } from '#react/components/ui/panel/PanelFieldGroup'
import { PanelGrid } from '#react/components/ui/panel/PanelGrid'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { SegmentedControl } from '#react/components/ui/SegmentedControl'
import { Tip } from '#react/components/ui/Tip'
import { useSharedStyleBinding } from '#react/controls/shared-style'
import { useEditor } from '#react/editor/context'
import { useI18n } from '#react/i18n'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import { Columns3, Eye, EyeOff, LayoutGrid, Minus, Plus, Rows3 } from 'lucide-react'

import type { LayoutGrid as LayoutGridSetting } from '@open-pencil/scene-graph'

export function LayoutGridSection() {
  const editor = useEditor()
  const { panels } = useI18n()
  const gridStyle = useSharedStyleBinding('grid')
  const selectedNode = useSceneComputed(() => editor.getSelectedNode() ?? null)
  const grids = selectedNode?.layoutGrids ?? []
  if (!selectedNode) return null

  const patternOptions = [
    { value: 'COLUMNS' as const, label: panels.gridColumns },
    { value: 'ROWS' as const, label: panels.gridRows },
    { value: 'GRID' as const, label: panels.gridGrid }
  ]

  function defaultGrid(): LayoutGridSetting {
    return {
      visible: true,
      color: { r: 1, g: 0, b: 0, a: 0.1 },
      pattern: 'COLUMNS',
      alignment: 'STRETCH',
      count: 5,
      gutterSize: 20,
      offset: 0,
      sectionSize: 0
    }
  }

  function commit(next: LayoutGridSetting[], label: string) {
    editor.updateNodeWithUndo(selectedNode.id, { layoutGrids: next }, label)
  }

  function patch(index: number, changes: Partial<LayoutGridSetting>, label = 'Edit layout guide') {
    commit(
      grids.map((grid, itemIndex) => (itemIndex === index ? { ...grid, ...changes } : grid)),
      label
    )
  }

  function gridPattern(grid: LayoutGridSetting): 'COLUMNS' | 'ROWS' | 'GRID' {
    if (grid.pattern) return grid.pattern
    return grid.axis === 'Y' ? 'ROWS' : 'COLUMNS'
  }

  return (
    <PanelSection
      label={panels.layoutGrids}
      empty={grids.length === 0 && !gridStyle.visible}
      actions={
        <IconButton
          label={panels.addLayoutGrid}
          onClick={() => commit([...grids, defaultGrid()], 'Add layout guide')}
        >
          <Plus className="size-3.5" />
        </IconButton>
      }
    >
      <SharedStyleField binding={gridStyle} label={panels.gridStyle} />
      {grids.map((grid, index) => {
        const pattern = gridPattern(grid)
        const isGrid = pattern === 'GRID'
        return (
          <div key={index} className="mb-1.5 flex items-start gap-1 last:mb-0">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <SegmentedControl
                value={pattern}
                options={patternOptions}
                label={panels.layoutGrids}
                onChange={(value) =>
                  patch(
                    index,
                    { pattern: value as LayoutGridSetting['pattern'] },
                    'Change grid pattern'
                  )
                }
                renderOption={(option) => (
                  <Tip label={option.label}>
                    <span className="flex items-center justify-center">
                      {option.value === 'COLUMNS' ? <Columns3 className="size-3.5" /> : null}
                      {option.value === 'ROWS' ? <Rows3 className="size-3.5" /> : null}
                      {option.value === 'GRID' ? <LayoutGrid className="size-3.5" /> : null}
                    </span>
                  </Tip>
                )}
              />
              <PanelGrid columns={2}>
                <PanelFieldGroup label={panels.gridCount}>
                  <NumberField
                    min={1}
                    aria-label={panels.gridCount}
                    value={grid.count ?? grid.numSections ?? 1}
                    onCommit={(value) => patch(index, { count: value })}
                  />
                </PanelFieldGroup>
                {isGrid ? (
                  <PanelFieldGroup label={panels.gridSectionSize}>
                    <NumberField
                      min={1}
                      aria-label={panels.gridSectionSize}
                      value={grid.sectionSize ?? 0}
                      onCommit={(value) => patch(index, { sectionSize: value })}
                    />
                  </PanelFieldGroup>
                ) : (
                  <PanelFieldGroup label={panels.gridGutter}>
                    <NumberField
                      min={0}
                      aria-label={panels.gridGutter}
                      value={grid.gutterSize ?? 0}
                      onCommit={(value) => patch(index, { gutterSize: value })}
                    />
                  </PanelFieldGroup>
                )}
                <PanelFieldGroup label={panels.gridMargin}>
                  <NumberField
                    aria-label={panels.gridMargin}
                    value={grid.offset ?? 0}
                    onCommit={(value) => patch(index, { offset: value })}
                  />
                </PanelFieldGroup>
              </PanelGrid>
            </div>
            <IconButton
              label={panels.toggleVisibility}
              active={grid.visible === false}
              onClick={() =>
                patch(index, { visible: grid.visible === false }, 'Toggle layout guide')
              }
            >
              {grid.visible === false ? (
                <EyeOff className="size-3.5" />
              ) : (
                <Eye className="size-3.5" />
              )}
            </IconButton>
            <IconButton
              label={panels.removeLayoutGrid}
              onClick={() =>
                commit(
                  grids.filter((_, itemIndex) => itemIndex !== index),
                  'Remove layout guide'
                )
              }
            >
              <Minus className="size-3.5" />
            </IconButton>
          </div>
        )
      })}
    </PanelSection>
  )
}
