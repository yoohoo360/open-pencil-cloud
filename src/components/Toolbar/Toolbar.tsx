import { ToolbarRoot, useEditorCommands, useI18n, useToolbarState, useViewportKind } from '@open-pencil/react'
import type { Tool } from '@open-pencil/react'

import { createToolbarActions } from '@/components/Toolbar/actions'
import { useActionToast } from '@/app/shell/toast/action'
import { useEditorStore } from '@/app/editor/active-store'
import { toolIcons } from '@/app/editor/icons'
import { useMenuUI } from '@/components/ui/menu'

import { DesktopToolbar } from './DesktopToolbar'
import { MobileToolbar } from './MobileToolbar'
import type { ToolbarActionItem } from './types'

export default function Toolbar() {
  const store = useEditorStore()
  const { isMobile } = useViewportKind()
  const { getCommand } = useEditorCommands()
  const { showActionToast } = useActionToast()
  const { menu, tools: toolTexts } = useI18n()

  const toolLabels = {
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
  } as Record<Tool, string>

  const toolShortcuts: Record<Tool, string> = {
    SELECT: 'V', FRAME: 'F', SECTION: 'S', RECTANGLE: 'R',
    ELLIPSE: 'O', LINE: 'L', POLYGON: '', STAR: '', PEN: 'P', TEXT: 'T', HAND: 'H'
  }

  const flyoutMenuCls = useMenuUI({ content: 'min-w-32' })
  const toolbarUi = { flyoutContent: flyoutMenuCls.content }
  const { editActions, arrangeActions } = createToolbarActions({ store, getCommand, menu })
  const { mobileCategory, slideDirection, hasPrev, hasNext, goPrev, goNext } = useToolbarState()

  function onActionTap(item: ToolbarActionItem) {
    item.action()
    showActionToast(item.label)
  }

  return (
    <ToolbarRoot>
      {({ tools, activeTool, actions }) =>
        !isMobile ? (
          <DesktopToolbar
            tools={tools}
            activeTool={activeTool}
            toolIcons={toolIcons}
            toolLabels={toolLabels}
            toolShortcuts={toolShortcuts}
            ui={toolbarUi}
            onSetTool={actions.setTool}
          />
        ) : (
          <MobileToolbar
            tools={tools}
            activeTool={activeTool}
            toolIcons={toolIcons}
            toolLabels={toolLabels}
            toolShortcuts={toolShortcuts}
            ui={toolbarUi}
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
        )
      }
    </ToolbarRoot>
  )
}
