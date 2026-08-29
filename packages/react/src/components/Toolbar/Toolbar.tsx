import type { Tool } from '@open-pencil/core/editor'

import { DesktopToolbar } from '#react/components/Toolbar/DesktopToolbar'
import { MobileToolbar } from '#react/components/Toolbar/MobileToolbar'
import { useToolbarActions } from '#react/components/Toolbar/actions'
import { useToolbarShortcuts } from '#react/components/Toolbar/shortcuts'
import type { ToolbarActionItem } from '#react/components/Toolbar/types'
import { toolIcons } from '#react/app/editor/icons'
import { useEditorStore } from '#react/app/editor/store'
import { useActionToast } from '#react/app/shell/toast/action'
import { useMenuUI } from '#react/components/ui/menu'
import { useEditorCommands } from '#react/editor/commands'
import { useI18n } from '#react/i18n'
import { ToolbarRoot } from '#react/primitives/Toolbar/ToolbarRoot'
import { useToolbarState } from '#react/primitives/Toolbar/useToolbarState'
import { useViewportKind } from '#react/editor/viewport-kind/use'

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

export function Toolbar() {
  const store = useEditorStore()
  const { isMobile } = useViewportKind()
  const { getCommand } = useEditorCommands()
  const { menu, tools: toolTexts } = useI18n()
  const { showActionToast } = useActionToast()
  useToolbarShortcuts()
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

  function onActionTap(item: ToolbarActionItem) {
    item.action()
    showActionToast(item.label)
  }

  return (
    <ToolbarRoot>
      {({ tools, activeTool, flyoutSelections, actions }) =>
        isMobile ? (
          <MobileToolbar
            tools={tools}
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
            editActions={editActions}
            arrangeActions={arrangeActions}
            onSetTool={actions.setTool}
            onPrev={goPrev}
            onNext={goNext}
            onAction={onActionTap}
          />
        ) : (
          <DesktopToolbar
            tools={tools}
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
