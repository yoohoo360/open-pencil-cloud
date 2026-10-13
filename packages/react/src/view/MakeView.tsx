import { useMemo } from 'react'
import { useStore } from '@nanostores/react'
import { useNavigate, useParams } from 'react-router-dom'

import { createEditorStore, EditorStoreProvider } from '#react/app/editor/store'
import { settingsDialogOpen } from '#react/app/settings/dialog'
import { SettingsDialog } from '#react/components/settings/SettingsDialog'
import { OpenPencilProvider } from '#react/editor/context'
import { MakePage } from '#react/view/MakePage'

/**
 * Make opens in its own tab without loading .fig or local-draft restore.
 * All design data comes from the prototype tab over the Make bridge.
 */
export default function MakeView() {
  const { fileKey } = useParams<{ fileKey: string }>()
  const navigate = useNavigate()
  const store = useMemo(() => createEditorStore(), [])
  const settingsOpen = useStore(settingsDialogOpen)

  return (
    <EditorStoreProvider store={store}>
      <OpenPencilProvider editor={store}>
        <main className="relative flex h-full min-h-0 w-full flex-col bg-panel" data-test-id="make-root">
          <MakePage
            onClose={() => {
              if (fileKey) navigate(`/design/${fileKey}`, { replace: true })
              else navigate('/dashboard', { replace: true })
            }}
          />
          {settingsOpen ? <SettingsDialog /> : null}
        </main>
      </OpenPencilProvider>
    </EditorStoreProvider>
  )
}
