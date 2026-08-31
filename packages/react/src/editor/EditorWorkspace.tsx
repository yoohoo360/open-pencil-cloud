import { useEditorStore } from '#react/app/editor/store'
import { useKeyboard } from '#react/app/shell/keyboard/use'
import { loadEditorLayout, saveEditorLayout } from '#react/app/shell/layout-storage'
import { appMenuShortcut } from '#react/app/shell/menu/shortcut'
import { useActiveTab } from '#react/app/tabs'
import { CanvasSplitRoot } from '#react/components/canvas/CanvasSplitRoot'
import { CollabPanel } from '#react/components/CollabPanel/CollabPanel'
import { CollabPanelProvider } from '#react/components/CollabPanel/context'
import { EditorCanvas } from '#react/components/EditorCanvas'
import { LayersPanel } from '#react/components/LayersPanel'
import { MobileDrawer } from '#react/components/MobileDrawer'
import { MobileHud } from '#react/components/MobileHud/MobileHud'
import { PropertiesPanel } from '#react/components/PropertiesPanel'
import { Toolbar } from '#react/components/Toolbar/Toolbar'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from '#react/components/ui/splitter'
import { Tip } from '#react/components/ui/Tip'
import { VersionHistoryProvider, useVersionHistory } from '#react/components/VersionHistory/context'
import { VersionHistoryPanel } from '#react/components/VersionHistory/VersionHistoryPanel'
import { formatShortcut } from '#react/editor/commands'
import { useViewportKind } from '#react/editor/viewport-kind/use'
import { useI18n } from '#react/i18n'
import splitterTheme from '#react/theme/splitter'
import { Sidebar } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { tv } from 'tailwind-variants'

export function EditorWorkspace({ collabRoomId }: { collabRoomId?: string | null }) {
  return (
    <CollabPanelProvider roomId={collabRoomId}>
      <VersionHistoryProvider>
        <EditorWorkspaceLayout />
      </VersionHistoryProvider>
    </CollabPanelProvider>
  )
}

function EditorWorkspaceLayout() {
  const [searchParams] = useSearchParams()
  const showChrome = !searchParams.has('no-chrome')
  const store = useEditorStore()
  const { dialogs } = useI18n()
  const { isMobile } = useViewportKind()
  const activeTab = useActiveTab()
  const versionHistory = useVersionHistory()
  const initialEditorLayout = useMemo(() => loadEditorLayout(), [])
  const horizontalSplitterStyles = useMemo(() => tv(splitterTheme)({ direction: 'horizontal' }), [])
  useKeyboard()

  if (!isMobile && showChrome && store.state.showUI) {
    return (
      <SplitterGroup
        key={activeTab?.id}
        direction="horizontal"
        className="flex-1 overflow-hidden"
        onLayout={saveEditorLayout}
      >
        <SplitterPanel
          id="layers"
          defaultSize={initialEditorLayout[0]}
          minSize={10}
          maxSize={30}
          className="flex"
        >
          <LayersPanel />
        </SplitterPanel>
        <SplitterResizeHandle
          data-test-id="left-splitter-handle"
          className={horizontalSplitterStyles.handle()}
        >
          <div className={horizontalSplitterStyles.divider()} />
        </SplitterResizeHandle>
        <SplitterPanel
          id="canvas"
          defaultSize={initialEditorLayout[1]}
          minSize={30}
          className="flex"
        >
          <div className="relative flex min-w-0 flex-1">
            <CanvasSplitRoot />
            <Toolbar />
          </div>
        </SplitterPanel>
        <SplitterResizeHandle className={horizontalSplitterStyles.handle()}>
          <div className={horizontalSplitterStyles.divider()} />
        </SplitterResizeHandle>
        <SplitterPanel
          id="properties"
          defaultSize={initialEditorLayout[2]}
          minSize={10}
          maxSize={30}
          className="flex flex-col"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-1.5 py-1.5">
            <CollabPanel />
          </div>
          {versionHistory.open ? <VersionHistoryPanel /> : <PropertiesPanel />}
        </SplitterPanel>
      </SplitterGroup>
    )
  }

  if (isMobile && showChrome && store.state.showUI) {
    return (
      <div key={`mobile-${activeTab?.id ?? ''}`} className="flex flex-1 overflow-hidden">
        <div className="relative flex min-w-0 flex-1">
          <EditorCanvas />
          <MobileHud />
          <Toolbar />
        </div>
        <MobileDrawer />
      </div>
    )
  }

  if (showChrome) {
    return (
      <div key={`collapsed-${activeTab?.id ?? ''}`} className="flex flex-1 overflow-hidden">
        <div className="relative flex min-w-0 flex-1">
          <EditorCanvas />
          {!isMobile ? (
            <div className="absolute top-7 left-7 z-10 flex items-center gap-2 rounded-lg border border-border bg-panel px-2 py-1 shadow-sm">
              <img src="/favicon-32.png" className="size-4" alt="OpenPencil" />
              <span data-test-id="editor-document-name" className="text-xs text-surface">
                {store.state.documentName}
              </span>
              <Tip
                label={dialogs.showUI({
                  shortcut: formatShortcut(appMenuShortcut('toggle-ui')) ?? ''
                })}
              >
                <button
                  type="button"
                  data-test-id="editor-show-ui"
                  className="ml-1 flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
                  onClick={() => store.setShowUI(true)}
                >
                  <Sidebar className="size-3.5" />
                </button>
              </Tip>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div key={`bare-${activeTab?.id ?? ''}`} className="flex flex-1 overflow-hidden">
      <div className="relative flex min-w-0 flex-1">
        <EditorCanvas />
      </div>
    </div>
  )
}
