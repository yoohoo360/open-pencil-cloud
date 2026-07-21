import { memo, useCallback } from 'react'

import { useI18n } from '@open-pencil/react'

import { useLayoutContext } from '@/components/properties/LayoutSection/types'

export const ClipContentControl = memo(function ClipContentControl() {
  const ctx = useLayoutContext()
  const { panels } = useI18n()

  const toggleClipContent = useCallback(() => {
    ctx.editor.updateNodeWithUndo(
      ctx.node.id,
      { clipsContent: !ctx.node.clipsContent },
      'Toggle clip content'
    )
  }, [ctx.editor, ctx.node.clipsContent, ctx.node.id])

  return (
    <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-surface">
      <input
        type="checkbox"
        data-test-id="clip-content-checkbox"
        className="accent-accent"
        checked={ctx.node.clipsContent}
        onChange={toggleClipContent}
      />
      {panels.clipContent}
    </label>
  )
})

ClipContentControl.displayName = 'ClipContentControl'
export default ClipContentControl
