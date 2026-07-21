import IconLucideArrowDown from '~icons/lucide/arrow-down'
import IconLucideArrowRight from '~icons/lucide/arrow-right'
import IconLucideLayoutGrid from '~icons/lucide/layout-grid'
import IconLucideWrapText from '~icons/lucide/wrap-text'
import { memo, useMemo } from 'react'

import { useI18n } from '@open-pencil/react'
import type { LayoutMode } from '@open-pencil/scene-graph'

import { useLayoutContext } from '@/components/properties/LayoutSection/types'
import IconButton from '@/components/ui/IconButton'

export const AutoLayoutControls = memo(function AutoLayoutControls() {
  const ctx = useLayoutContext()
  const { panels } = useI18n()

  const layoutModes = useMemo<Array<{ mode: LayoutMode; label: string }>>(
    () => [
      { mode: 'HORIZONTAL', label: panels.layoutHorizontal },
      { mode: 'VERTICAL', label: panels.layoutVertical },
      { mode: 'GRID', label: panels.layoutGrid }
    ],
    [panels.layoutGrid, panels.layoutHorizontal, panels.layoutVertical]
  )

  if (ctx.node.layoutMode === 'NONE') return null

  return (
    <div className="flex items-center gap-1" role="toolbar" aria-label={panels.flow}>
      {layoutModes.map((direction) => (
        <IconButton
          key={direction.mode}
          label={direction.label}
          size="md"
          active={
            direction.mode === 'GRID' ? ctx.isGrid : ctx.node.layoutMode === direction.mode
          }
          onClick={() => ctx.editor.setLayoutMode(ctx.node.id, direction.mode)}
        >
          {direction.mode === 'HORIZONTAL' ? (
            <IconLucideArrowRight className="size-3.5" />
          ) : direction.mode === 'VERTICAL' ? (
            <IconLucideArrowDown className="size-3.5" />
          ) : (
            <IconLucideLayoutGrid className="size-3.5" />
          )}
        </IconButton>
      ))}
      {ctx.isFlex ? (
        <IconButton
          label={panels.layoutWrap}
          size="md"
          active={ctx.node.layoutWrap === 'WRAP'}
          onClick={() =>
            ctx.updateProp('layoutWrap', ctx.node.layoutWrap === 'WRAP' ? 'NO_WRAP' : 'WRAP')
          }
        >
          <IconLucideWrapText className="size-3.5" />
        </IconButton>
      ) : null}
    </div>
  )
})

AutoLayoutControls.displayName = 'AutoLayoutControls'
export default AutoLayoutControls
