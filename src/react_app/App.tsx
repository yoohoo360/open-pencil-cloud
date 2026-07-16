import * as Tooltip from '@radix-ui/react-tooltip'
import { useMemo, useSyncExternalStore } from 'react'
import { Route, Routes } from 'react-router-dom'
import { watch } from 'vue'

import { ReactIslandSmoke } from '@/react_app/islands/ReactIslandSmoke'
import { EditorBridge } from '@/react_app/shell/EditorBridge'
import { AppToast } from '@/react_app/toast/AppToast'
import { EditorView } from '@/react_app/views/EditorView'
import { activeTab, activeTabId, allTabs, createTab } from '@/stores/tabs'

function subscribeActiveTab(onStoreChange: () => void): () => void {
  const stopId = watch(activeTabId, onStoreChange, { flush: 'sync' })
  const stopTabs = watch(allTabs, onStoreChange, { flush: 'sync' })
  return () => {
    stopId()
    stopTabs()
  }
}

function getActiveEditor() {
  return activeTab.value?.store ?? null
}

/**
 * React application shell.
 * Routes mirror vue-router (`/`, `/demo`, `/share/:roomId`).
 * EditorProvider is bridged from the live app tab store for React islands.
 */
export function App() {
  // Ensure a tab exists before EditorBridge / Vue shell mount (stable tree).
  useMemo(() => {
    if (!activeTab.value) createTab()
  }, [])

  const editor = useSyncExternalStore(subscribeActiveTab, getActiveEditor, () => null)

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
