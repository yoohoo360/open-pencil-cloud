import { useLayoutControlsContext } from '#react/controls/layout/use'
import { useI18n } from '#react/i18n'

export function ClipContentControl() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const node = ctx.node
  if (!node) return null

  return (
    <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-surface">
      <input
        type="checkbox"
        data-test-id="clip-content-checkbox"
        className="accent-accent"
        checked={node.clipsContent}
        onChange={() =>
          ctx.editor.updateNodeWithUndo(
            node.id,
            { clipsContent: !node.clipsContent },
            'Toggle clip content'
          )
        }
      />
      {panels.clipContent}
    </label>
  )
}
