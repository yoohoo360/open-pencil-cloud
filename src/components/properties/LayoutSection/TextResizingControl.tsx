import IconLucideLock from '~icons/lucide/lock'
import IconLucideMoveHorizontal from '~icons/lucide/move-horizontal'
import IconLucideWrapText from '~icons/lucide/wrap-text'
import { memo, useCallback, useMemo } from 'react'

import { useI18n } from '@open-pencil/react'
import type { SceneNode } from '@open-pencil/scene-graph'

import { useLayoutContext } from '@/components/properties/LayoutSection/types'
import SegmentedControl from '@/components/ui/SegmentedControl'
import Tip from '@/components/ui/Tip'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup'

type TextResizeMode = 'AUTO_WIDTH' | 'AUTO_HEIGHT' | 'FIXED'

function modeFor(node: SceneNode | null): TextResizeMode {
  if (node?.textAutoResize === 'WIDTH_AND_HEIGHT') return 'AUTO_WIDTH'
  if (node?.textAutoResize === 'HEIGHT' || node?.textAutoResize === 'TRUNCATE') return 'AUTO_HEIGHT'
  return 'FIXED'
}

export const TextResizingControl = memo(function TextResizingControl() {
  const ctx = useLayoutContext()
  const { panels } = useI18n()

  const mode = useMemo(() => modeFor(ctx.node), [ctx.node])

  const options = useMemo(
    () => [
      { value: 'AUTO_WIDTH' as const, label: panels.resizeAutoWidth },
      { value: 'AUTO_HEIGHT' as const, label: panels.resizeAutoHeight },
      { value: 'FIXED' as const, label: panels.resizeFixed }
    ],
    [panels.resizeAutoHeight, panels.resizeAutoWidth, panels.resizeFixed]
  )

  const setMode = useCallback(
    (value: TextResizeMode) => {
      const node = ctx.node
      if (!node) return
      const byMode: Record<TextResizeMode, SceneNode['textAutoResize']> = {
        AUTO_WIDTH: 'WIDTH_AND_HEIGHT',
        AUTO_HEIGHT: 'HEIGHT',
        FIXED: 'NONE'
      }
      ctx.editor.updateNodeWithUndo(node.id, { textAutoResize: byMode[value] }, 'Set text resizing')
    },
    [ctx.editor, ctx.node]
  )

  return (
    <PanelFieldGroup label={panels.resizing} className="mb-3">
      <SegmentedControl
        value={mode}
        options={options}
        label={panels.resizing}
        onValueChange={(value) => setMode(value as TextResizeMode)}
        renderOption={({ option }) => (
          <Tip label={option.label}>
            <span className="flex items-center justify-center">
            {option.value === 'AUTO_WIDTH' ? (
              <IconLucideMoveHorizontal className="size-3.5" />
            ) : option.value === 'AUTO_HEIGHT' ? (
              <IconLucideWrapText className="size-3.5" />
            ) : (
              <IconLucideLock className="size-3.5" />
            )}
            </span>
          </Tip>
        )}
      />
    </PanelFieldGroup>
  )
})

TextResizingControl.displayName = 'TextResizingControl'
export default TextResizingControl
