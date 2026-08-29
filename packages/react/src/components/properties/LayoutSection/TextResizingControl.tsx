import { Lock, MoveHorizontal, WrapText } from 'lucide-react'
import type { SceneNode } from '@open-pencil/scene-graph'

import { PanelFieldGroup } from '#react/components/ui/panel/PanelFieldGroup'
import { SegmentedControl } from '#react/components/ui/SegmentedControl'
import { Tip } from '#react/components/ui/Tip'
import { useLayoutControlsContext } from '#react/controls/layout/use'
import { useI18n } from '#react/i18n'

type TextResizeMode = 'AUTO_WIDTH' | 'AUTO_HEIGHT' | 'FIXED'

function modeFor(node: SceneNode | null): TextResizeMode {
  if (node?.textAutoResize === 'WIDTH_AND_HEIGHT') return 'AUTO_WIDTH'
  if (node?.textAutoResize === 'HEIGHT' || node?.textAutoResize === 'TRUNCATE') return 'AUTO_HEIGHT'
  return 'FIXED'
}

export function TextResizingControl() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const node = ctx.node
  if (!node) return null

  const options = [
    { value: 'AUTO_WIDTH' as const, label: panels.resizeAutoWidth },
    { value: 'AUTO_HEIGHT' as const, label: panels.resizeAutoHeight },
    { value: 'FIXED' as const, label: panels.resizeFixed }
  ]

  function setMode(value: TextResizeMode) {
    const byMode: Record<TextResizeMode, SceneNode['textAutoResize']> = {
      AUTO_WIDTH: 'WIDTH_AND_HEIGHT',
      AUTO_HEIGHT: 'HEIGHT',
      FIXED: 'NONE'
    }
    ctx.editor.updateNodeWithUndo(node.id, { textAutoResize: byMode[value] }, 'Set text resizing')
  }

  return (
    <PanelFieldGroup label={panels.resizing} className="mb-3">
      <SegmentedControl
        value={modeFor(node)}
        options={options}
        label={panels.resizing}
        onChange={(value) => setMode(value as TextResizeMode)}
        renderOption={(option) => (
          <Tip label={option.label}>
            <span className="flex items-center justify-center">
              {option.value === 'AUTO_WIDTH' ? <MoveHorizontal className="size-3.5" /> : null}
              {option.value === 'AUTO_HEIGHT' ? <WrapText className="size-3.5" /> : null}
              {option.value === 'FIXED' ? <Lock className="size-3.5" /> : null}
            </span>
          </Tip>
        )}
      />
    </PanelFieldGroup>
  )
}
