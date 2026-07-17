import type { ReactNode } from 'react'

import type { Editor } from '@open-pencil/core/editor'

import { ReactIslandSmoke } from '@/react_app/islands/ReactIslandSmoke'
import { EditorBridge } from '@/react_app/shell/EditorBridge'

export function ReactHostShell({
  editor,
  showSmoke = false,
  children
}: {
  editor: Editor
  showSmoke?: boolean
  children?: ReactNode
}) {
  return (
    <EditorBridge editor={editor}>
      {children}
      {showSmoke ? <ReactIslandSmoke /> : null}
    </EditorBridge>
  )
}
