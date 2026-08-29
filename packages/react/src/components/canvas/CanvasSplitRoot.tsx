import { useEditorStore } from '#react/app/editor/store'
import { CanvasSplitNode } from '#react/components/canvas/CanvasSplitNode'

export function CanvasSplitRoot() {
  const store = useEditorStore()
  return (
    <div data-slot="canvas-split-root" className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <CanvasSplitNode node={store.splitTree} />
    </div>
  )
}
