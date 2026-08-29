import { tv } from 'tailwind-variants'
import { Fragment } from 'react'

import { useEditorStore } from '#react/app/editor/store'
import type { CanvasSplitNode as SplitNode } from '#react/editor/panes/split-tree'
import { CanvasPaneHeader } from '#react/components/canvas/CanvasPaneHeader'
import { EditorCanvas } from '#react/components/EditorCanvas'
import {
  SplitterGroup,
  SplitterPanel,
  SplitterResizeHandle
} from '#react/components/ui/splitter'
import splitterTheme from '#react/theme/splitter'

export function CanvasSplitNode({ node }: { node: SplitNode }) {
  const store = useEditorStore()
  const direction = node.type === 'split' ? node.direction : 'horizontal'
  const splitterStyles = tv(splitterTheme)

  function setLayout(sizes: number[]) {
    if (node.type === 'split') store.setSplitSizes(node.id, sizes)
  }

  if (node.type === 'pane') {
    return (
      <div
        data-pane-id={node.paneId}
        className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        {store.visiblePaneCount > 1 ? <CanvasPaneHeader paneId={node.paneId} /> : null}
        <EditorCanvas paneId={node.paneId} />
      </div>
    )
  }

  return (
    <SplitterGroup
      id={node.id}
      direction={direction}
      className="flex min-h-0 min-w-0 flex-1 overflow-hidden"
      onLayout={setLayout}
    >
      {node.children.map((child, index) => {
        const key = child.type === 'pane' ? child.paneId : child.id
        return (
          <Fragment key={key}>
            <SplitterPanel
              id={`${node.id}-panel-${index}`}
              defaultSize={node.sizes[index]}
              minSize={12}
              className="flex min-h-0 min-w-0 overflow-hidden"
            >
              <CanvasSplitNode node={child} />
            </SplitterPanel>
            {index < node.children.length - 1 ? (
              <SplitterResizeHandle
                id={`${node.id}-handle-${index}`}
                data-split-id={node.id}
                className={splitterStyles({ direction }).handle()}
              >
                <div className={splitterStyles({ direction }).divider()} />
              </SplitterResizeHandle>
            ) : null}
          </Fragment>
        )
      })}
    </SplitterGroup>
  )
}
