import * as Tooltip from '@radix-ui/react-tooltip'
import { useMemo, useSyncExternalStore } from 'react'
import { Route, Routes } from 'react-router-dom'

import { ReactIslandSmoke } from '@/react_app/islands/ReactIslandSmoke'
import { EditorBridge } from '@/react_app/shell/EditorBridge'
import { AppToast } from '@/react_app/toast/AppToast'
import { EditorView } from '@/react_app/views/EditorView'
import { createTab, getActiveTab, subscribeTabs } from '@/stores/tabs'

function getActiveEditor() {
  return getActiveTab()?.store ?? null
}

/**
 * React application shell.
 * Routes: `/`, `/demo`, `/share/:roomId`.
 */
export function App() {
  useMemo(() => {
    if (!getActiveTab()) createTab()
  }, [])

  const editor = useSyncExternalStore(subscribeTabs, getActiveEditor, () => null)

  return (
    <Tooltip.Provider delayDuration={400}>
      {editor ? (
        <EditorBridge editor={editor}>
          <Routes>
            <Route path="/" element={<EditorView />} />
            <Route path="/demo" element={<EditorView />} />
            <Route path="/share/:roomId" element={<EditorView />} />
          </Routes>
          {import.meta.env.DEV ? <ReactIslandSmoke /> : null}
        </EditorBridge>
      ) : null}
      <AppToast />
    </Tooltip.Provider>
  )
}
