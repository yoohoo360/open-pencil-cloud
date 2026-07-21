import IconLucideColumns3 from '~icons/lucide/columns-3'
import IconLucideEye from '~icons/lucide/eye'
import IconLucideEyeOff from '~icons/lucide/eye-off'
import IconLucideLayoutGrid from '~icons/lucide/layout-grid'
import IconLucideMinus from '~icons/lucide/minus'
import IconLucidePlus from '~icons/lucide/plus'
import IconLucideRows3 from '~icons/lucide/rows-3'
import { memo, useCallback, useMemo } from 'react'

import { useI18n, useSceneComputed } from '@open-pencil/react'
import type { LayoutGrid } from '@open-pencil/scene-graph'

import { useLayoutContext } from '@/components/properties/LayoutSection/types'
import NumberField from '@/components/inputs/NumberField'
import IconButton from '@/components/ui/IconButton'
import SegmentedControl from '@/components/ui/SegmentedControl'
import Tip from '@/components/ui/Tip'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup'
import PanelGrid from '@/components/ui/panel/PanelGrid'
import PanelItemRow from '@/components/ui/panel/PanelItemRow'
import PanelSection from '@/components/ui/panel/PanelSection'

function defaultGrid(): LayoutGrid {
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

function gridPattern(grid: LayoutGrid): 'COLUMNS' | 'ROWS' | 'GRID' {
  if (grid.pattern) return grid.pattern
  return grid.axis === 'Y' ? 'ROWS' : 'COLUMNS'
}

function isGrid(grid: LayoutGrid): boolean {
  return gridPattern(grid) === 'GRID'
}

export const LayoutGridSection = memo(function LayoutGridSection() {
  const ctx = useLayoutContext()
  const { panels } = useI18n()

  const selectedNode = useSceneComputed(() => ctx.editor.getSelectedNode() ?? null)
  const grids = useMemo<LayoutGrid[]>(() => selectedNode?.layoutGrids ?? [], [selectedNode])

  const patternOptions = useMemo(
    () => [
      { value: 'COLUMNS' as const, label: panels.gridColumns },
      { value: 'ROWS' as const, label: panels.gridRows },
      { value: 'GRID' as const, label: panels.gridGrid }
    ],
    [panels.gridColumns, panels.gridGrid, panels.gridRows]
  )

  const commit = useCallback(
    (next: LayoutGrid[], label: string) => {
      const node = selectedNode
      if (!node) return
      ctx.editor.updateNodeWithUndo(node.id, { layoutGrids: next }, label)
    },
    [ctx.editor, selectedNode]
  )

  const add = useCallback(() => {
    commit([...grids, defaultGrid()], 'Add layout grid')
  }, [commit, grids])

  const remove = useCallback(
    (index: number) => {
      commit(
        grids.filter((_, i) => i !== index),
        'Remove layout grid'
      )
    },
    [commit, grids]
  )

  const patch = useCallback(
    (index: number, changes: Partial<LayoutGrid>, label = 'Edit layout grid') => {
      commit(
        grids.map((grid, i) => (i === index ? { ...grid, ...changes } : grid)),
        label
      )
    },
    [commit, grids]
  )

  return (
    <PanelSection
      label={panels.layoutGrids}
      empty={grids.length === 0}
      actions={
        <IconButton label={panels.addLayoutGrid} onClick={add}>
          <IconLucidePlus className="size-3.5" />
        </IconButton>
      }
    >
      {grids.map((grid, index) => (
        <PanelItemRow
          key={index}
          className="items-start"
          rail={() => (
            <>
              <IconButton
                label={panels.toggleVisibility}
                active={grid.visible === false}
                onClick={() =>
                  patch(index, { visible: grid.visible === false }, 'Toggle layout grid')
                }
              >
                {grid.visible === false ? (
                  <IconLucideEyeOff className="size-3.5" />
                ) : (
                  <IconLucideEye className="size-3.5" />
                )}
              </IconButton>
              <IconButton label={panels.removeLayoutGrid} onClick={() => remove(index)}>
                <IconLucideMinus className="size-3.5" />
              </IconButton>
            </>
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <SegmentedControl
              value={gridPattern(grid)}
              options={patternOptions}
              label={panels.layoutGrids}
              onValueChange={(value) =>
                patch(index, { pattern: value as LayoutGrid['pattern'] }, 'Change grid pattern')
              }
              renderOption={({ option }) => (
                <Tip label={option.label}>
                  <span className="flex items-center justify-center">
                  {option.value === 'COLUMNS' ? (
                    <IconLucideColumns3 className="size-3.5" />
                  ) : option.value === 'ROWS' ? (
                    <IconLucideRows3 className="size-3.5" />
                  ) : (
                    <IconLucideLayoutGrid className="size-3.5" />
                  )}
                  </span>
                </Tip>
              )}
            />
            <PanelGrid columns="two">
              <PanelFieldGroup label={panels.gridCount}>
                <NumberField
                  value={grid.count ?? grid.numSections ?? 1}
                  min={1}
                  aria-label={panels.gridCount}
                  onValueChange={(value) => patch(index, { count: value })}
                />
              </PanelFieldGroup>
              {!isGrid(grid) ? (
                <PanelFieldGroup label={panels.gridGutter}>
                  <NumberField
                    value={grid.gutterSize ?? 0}
                    min={0}
                    aria-label={panels.gridGutter}
                    onValueChange={(value) => patch(index, { gutterSize: value })}
                  />
                </PanelFieldGroup>
              ) : null}
              {isGrid(grid) ? (
                <PanelFieldGroup label={panels.gridSectionSize}>
                  <NumberField
                    value={grid.sectionSize ?? 0}
                    min={1}
                    aria-label={panels.gridSectionSize}
                    onValueChange={(value) => patch(index, { sectionSize: value })}
                  />
                </PanelFieldGroup>
              ) : null}
              <PanelFieldGroup label={panels.gridMargin}>
                <NumberField
                  value={grid.offset ?? 0}
                  aria-label={panels.gridMargin}
                  onValueChange={(value) => patch(index, { offset: value })}
                />
              </PanelFieldGroup>
            </PanelGrid>
          </div>
        </PanelItemRow>
      ))}
    </PanelSection>
  )
})

LayoutGridSection.displayName = 'LayoutGridSection'
export default LayoutGridSection
