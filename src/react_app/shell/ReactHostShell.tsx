import { ReactIslandSmoke } from '@/react_app/islands/ReactIslandSmoke'
import { EditorBridge } from '@/react_app/shell/EditorBridge'
import { AppToast } from '@/react_app/toast/AppToast'

import type { Editor } from '@open-pencil/core/editor'
import type { ReactNode } from 'react'

export function ReactHostShell({
  editor,
  showSmoke = false,
  children
}: {
  editor?: Editor | null
  showSmoke?: boolean
  children?: ReactNode
}) {
  return (
    <>
      <AppToast />
      {editor ? (
        <EditorBridge editor={editor}>
          {children}
          {showSmoke ? <ReactIslandSmoke /> : null}
        </EditorBridge>
      ) : null}
    </>
  )
}
