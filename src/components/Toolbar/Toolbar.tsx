import { memo, useMemo, type ComponentType } from 'react'

import {
  ToolbarRoot,
  useEditorCommands,
  useI18n,
  useToolbarState,
  useViewportKind,
  type Tool
} from '@open-pencil/react'
import { useToolbarActions } from '@/components/Toolbar/actions'
import DesktopToolbar from '@/components/Toolbar/DesktopToolbar'
import MobileToolbar from '@/components/Toolbar/MobileToolbar'
import type { ToolbarActionItem } from '@/components/Toolbar/types'
import { useMenuUI } from '@/components/ui/menu'
import { useActionToast } from '@/app/shell/toast/action'
import { useEditorStore } from '@/app/editor/active-store'
import { toolIcons } from '@/app/editor/icons'

export const Toolbar = memo(function Toolbar() {
  const store = useEditorStore()
  const { isMobile } = useViewportKind()
  const { getCommand } = useEditorCommands()
  const { showActionToast } = useActionToast()
  const { menu, tools: toolTexts } = useI18n()

  const toolLabels = useMemo<Record<Tool, string>>(
    () => ({
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
    }),
    [toolTexts]
  )

  const toolShortcuts = useMemo<Record<Tool, string>>(
    () => ({
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
    }),
    []
  )

  const flyoutMenuCls = useMenuUI({ content: 'min-w-32' })
  const toolbarUi = useMemo(() => ({ flyoutContent: flyoutMenuCls.content }), [flyoutMenuCls.content])
  const { editActions, arrangeActions } = useToolbarActions({ store, getCommand, menu })
  const { mobileCategory, slideDirection, hasPrev, hasNext, goPrev, goNext } = useToolbarState()

  const onActionTap = (item: ToolbarActionItem) => {
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
            toolIcons={toolIcons as Record<Tool, ComponentType>}
            toolLabels={toolLabels}
            toolShortcuts={toolShortcuts}
            ui={toolbarUi}
            onSetTool={actions.setTool}
          />
        ) : (
          <MobileToolbar
            tools={tools}
            activeTool={activeTool}
            toolIcons={toolIcons as Record<Tool, ComponentType>}
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
})

Toolbar.displayName = 'Toolbar'
export default Toolbar
