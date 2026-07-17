import IconArrowRight from '~icons/lucide/arrow-right'
import IconArrowDown from '~icons/lucide/arrow-down'
import IconLayoutGrid from '~icons/lucide/layout-grid'
import IconPlus from '~icons/lucide/plus'
import IconMinus from '~icons/lucide/minus'
import IconWrapText from '~icons/lucide/wrap-text'

import { useI18n, useLayoutControlsContext } from '@open-pencil/react'
import type { LayoutMode } from '@open-pencil/scene-graph'
import { IconButton } from '@/components/ui/IconButton'
import { PanelRow } from '@/components/ui/panel/PanelRow'

const layoutModes: { mode: LayoutMode; test: string }[] = [
  { mode: 'HORIZONTAL', test: 'horizontal' },
  { mode: 'VERTICAL', test: 'vertical' },
  { mode: 'GRID', test: 'grid' }
]

export function AutoLayoutControls() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const node = ctx.node.value
  if (!node) return null

  return (
    <>
      <PanelRow>
        {node.layoutMode === 'NONE' ? (
          <IconButton
            label={panels.addAutoLayout}
            data-test-id="layout-add-auto"
            onClick={() => ctx.editor.setLayoutMode(node.id, 'VERTICAL')}
          >
            <IconPlus className="size-3.5" />
          </IconButton>
        ) : (
          <IconButton
            label={panels.removeAutoLayout}
            data-test-id="layout-remove-auto"
            onClick={() => ctx.editor.setLayoutMode(node.id, 'NONE')}
          >
            <IconMinus className="size-3.5" />
          </IconButton>
        )}
      </PanelRow>

      {node.layoutMode !== 'NONE' && (
        <PanelRow className="mt-1.5" gap="sm">
          {layoutModes.map((dir) => (
            <IconButton
              key={dir.mode}
              size="md"
              active={dir.mode === 'GRID' ? ctx.isGrid.value : node.layoutMode === dir.mode}
              data-test-id={`layout-direction-${dir.test}`}
              onClick={() => ctx.editor.setLayoutMode(node.id, dir.mode)}
            >
              {dir.mode === 'HORIZONTAL' && <IconArrowRight className="size-3.5" />}
              {dir.mode === 'VERTICAL' && <IconArrowDown className="size-3.5" />}
              {dir.mode === 'GRID' && <IconLayoutGrid className="size-3.5" />}
            </IconButton>
          ))}
          {ctx.isFlex.value && (
            <IconButton
              size="md"
              active={node.layoutWrap === 'WRAP'}
              data-test-id="layout-direction-wrap"
              onClick={() => ctx.updateProp('layoutWrap', node.layoutWrap === 'WRAP' ? 'NO_WRAP' : 'WRAP')}
            >
              <IconWrapText className="size-3.5" />
            </IconButton>
          )}
        </PanelRow>
      )}
    </>
  )
}
