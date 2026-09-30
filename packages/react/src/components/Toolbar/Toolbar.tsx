import { useEffect, useMemo } from 'react'

import { EDITOR_TOOLS, type EditorToolDef, type Tool } from '@open-pencil/core/editor'

import { toolIcons } from '#react/app/editor/icons'
import { useEditorStore } from '#react/app/editor/store'
import { useActionToast } from '#react/app/shell/toast/action'
import { useWorkspaceMode } from '#react/app/shell/workspace-mode'
import { DesktopToolbar } from '#react/components/Toolbar/DesktopToolbar'
import { MobileToolbar } from '#react/components/Toolbar/MobileToolbar'
import { useToolbarActions } from '#react/components/Toolbar/actions'
import type { ToolbarActionItem } from '#react/components/Toolbar/types'
import { useMenuUI } from '#react/components/ui/menu'
import { useEditorCommands } from '#react/editor/commands'
import { useViewportKind } from '#react/editor/viewport-kind/use'
import { useI18n } from '#react/i18n'
import { ToolbarRoot } from '#react/primitives/Toolbar/ToolbarRoot'
import { useToolbarState } from '#react/primitives/Toolbar/useToolbarState'

const toolShortcuts: Record<Tool, string> = {
  SELECT: 'V',
  FRAME: 'F',
  SECTION: 'S',
  RECTANGLE: 'R',
  ELLIPSE: 'O',
  LINE: 'L',
  POLYGON: '',
  STAR: '',
  PEN: 'P',
  TEXT: 'T',
  HAND: 'H'
}

const VIEW_SAFE_TOOLS = new Set<Tool>(['SELECT', 'HAND'])

function toolsForMode(mode: 'view' | 'edit' | 'dev'): EditorToolDef[] {
  if (mode === 'edit') return EDITOR_TOOLS
  return EDITOR_TOOLS.filter((tool) => VIEW_SAFE_TOOLS.has(tool.key))
}

export function Toolbar() {
  const store = useEditorStore()
  const mode = useWorkspaceMode()
  const tools = useMemo(() => toolsForMode(mode), [mode])
  const { isMobile } = useViewportKind()
  const { getCommand } = useEditorCommands()
  const { menu, tools: toolTexts } = useI18n()
  const { showActionToast } = useActionToast()
  const toolLabels: Record<Tool, string> = {
    SELECT: toolTexts.move,
    FRAME: toolTexts.frame,
    SECTION: toolTexts.section,
    RECTANGLE: toolTexts.rectangle,
    ELLIPSE: toolTexts.ellipse,
    LINE: toolTexts.line,
    POLYGON: toolTexts.polygon,
    STAR: toolTexts.star,
    PEN: toolTexts.pen,
    TEXT: toolTexts.text,
    HAND: toolTexts.hand
  }
  const flyoutMenuCls = useMenuUI({ content: 'min-w-32' })
  const toolbarUI = { flyoutContent: flyoutMenuCls.content }
  const { editActions, arrangeActions } = useToolbarActions({ store, getCommand, menu })
  const { mobileCategory, slideDirection, hasPrev, hasNext, goPrev, goNext } = useToolbarState()

  // Drop create tools when leaving Edit so the canvas tool stays valid.
  useEffect(() => {
    if (mode === 'edit') return
    if (!VIEW_SAFE_TOOLS.has(store.state.activeTool)) store.setTool('SELECT')
  }, [mode, store])

  function onActionTap(item: ToolbarActionItem) {
    item.action()
    showActionToast(item.label)
  }

  return (
    <ToolbarRoot tools={tools}>
      {({ tools: slotTools, activeTool, flyoutSelections, actions }) =>
        isMobile ? (
          <MobileToolbar
            tools={slotTools}
            activeTool={activeTool}
            flyoutSelections={flyoutSelections}
            toolIcons={toolIcons}
            toolLabels={toolLabels}
            toolShortcuts={toolShortcuts}
            ui={toolbarUI}
            mobileCategory={mobileCategory}
            slideDirection={slideDirection}
            hasPrev={hasPrev}
            hasNext={hasNext}
            editActions={mode === 'edit' ? editActions : []}
            arrangeActions={mode === 'edit' ? arrangeActions : []}
            onSetTool={actions.setTool}
            onPrev={goPrev}
            onNext={goNext}
            onAction={onActionTap}
          />
        ) : (
          <DesktopToolbar
            tools={slotTools}
            activeTool={activeTool}
            flyoutSelections={flyoutSelections}
            toolIcons={toolIcons}
            toolLabels={toolLabels}
            toolShortcuts={toolShortcuts}
            ui={toolbarUI}
            onSetTool={actions.setTool}
          />
        )
      }
    </ToolbarRoot>
  )
}
