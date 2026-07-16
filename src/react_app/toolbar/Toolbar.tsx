import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Copy,
  CopyPlus,
  Group,
  Lock,
  Scissors,
  Trash2,
  Ungroup,
  type LucideIcon
} from 'lucide-react'
import { useMemo } from 'react'

import { ACTION_TOAST_DURATION } from '@/constants'
import { EditorBridge } from '@/react_app/shell/EditorBridge'
import { toolIcons } from '@/react_app/toolbar/toolIcons'
import { menu, menuContent } from '@/react_app/ui/menu'
import { Tip, TipProvider } from '@/react_app/ui/Tip'
import {
  ToolbarItem,
  ToolbarRoot,
  useEditor,
  useEditorCommands,
  useI18n,
  useToolbarState,
  useViewportKind
} from '@open-pencil/react'

import type { Editor, EditorToolDef, Tool } from '@open-pencil/core/editor'

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

function mobileCategoryTestId(category: number): string {
  if (category === 0) return 'mobile-toolbar-tools'
  if (category === 1) return 'mobile-toolbar-edit'
  return 'mobile-toolbar-arrange'
}

interface ActionItem {
  icon: LucideIcon
  label: string
  action: () => void
  testId: string
}

type AppEditor = Editor & {
  state: Editor['state'] & { actionToast: string | null }
  mobileCopy: () => void
  mobilePaste: () => void
  mobileCut: () => void
}

let actionToastTimer: ReturnType<typeof setTimeout> | undefined

function showActionToast(editor: AppEditor, label: string) {
  editor.state.actionToast = label
  clearTimeout(actionToastTimer)
  actionToastTimer = setTimeout(() => {
    editor.state.actionToast = null
  }, ACTION_TOAST_DURATION)
}

function ToolbarInner() {
  const editor = useEditor() as AppEditor
  const { isMobile } = useViewportKind()
  const { getCommand } = useEditorCommands()
  const { menu: t, tools: toolTexts } = useI18n()
  const {
    mobileCategory,
    slideDirection,
    hasPrev,
    hasNext,
    isActive,
    activeKeyForTool,
    goPrev,
    goNext
  } = useToolbarState()

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

  const editActions = useMemo<ActionItem[]>(
    () => [
      { icon: Copy, label: t.copy, action: () => editor.mobileCopy(), testId: 'copy' },
      { icon: Clipboard, label: t.paste, action: () => editor.mobilePaste(), testId: 'paste' },
      { icon: Scissors, label: t.cut, action: () => editor.mobileCut(), testId: 'cut' },
      {
        icon: CopyPlus,
        label: getCommand('selection.duplicate').label,
        action: () => getCommand('selection.duplicate').run(),
        testId: getCommand('selection.duplicate').label.toLowerCase()
      },
      {
        icon: Trash2,
        label: getCommand('selection.delete').label,
        action: () => getCommand('selection.delete').run(),
        testId: getCommand('selection.delete').label.toLowerCase()
      }
    ],
    [editor, getCommand, t.copy, t.cut, t.paste]
  )

  const arrangeActions = useMemo<ActionItem[]>(
    () => [
      {
        icon: ArrowUpToLine,
        label: t.front,
        action: () => getCommand('selection.bringToFront').run(),
        testId: t.front.toLowerCase()
      },
      {
        icon: ArrowDownToLine,
        label: t.back,
        action: () => getCommand('selection.sendToBack').run(),
        testId: t.back.toLowerCase()
      },
      {
        icon: Group,
        label: getCommand('selection.group').label,
        action: () => getCommand('selection.group').run(),
        testId: getCommand('selection.group').label.toLowerCase()
      },
      {
        icon: Ungroup,
        label: getCommand('selection.ungroup').label,
        action: () => getCommand('selection.ungroup').run(),
        testId: getCommand('selection.ungroup').label.toLowerCase()
      },
      {
        icon: Lock,
        label: t.lock,
        action: () => getCommand('selection.toggleLock').run(),
        testId: t.lock.toLowerCase()
      }
    ],
    [getCommand, t.back, t.front, t.lock]
  )

  const flyoutContentCls = menuContent({ class: 'min-w-32' })

  function onActionTap(item: ActionItem) {
    item.action()
    showActionToast(editor, item.label)
  }

  return (
    <TipProvider>
      <ToolbarRoot>
        {({ tools, activeTool, setTool }) =>
          isMobile ? (
            <MobileToolbar
              tools={tools}
              activeTool={activeTool}
              setTool={setTool}
              toolLabels={toolLabels}
              isActive={isActive}
              activeKeyForTool={activeKeyForTool}
              mobileCategory={mobileCategory}
              slideDirection={slideDirection}
              hasPrev={hasPrev}
              hasNext={hasNext}
              goPrev={goPrev}
              goNext={goNext}
              editActions={editActions}
              arrangeActions={arrangeActions}
              onActionTap={onActionTap}
              flyoutContentCls={flyoutContentCls}
            />
          ) : (
            <DesktopToolbar
              tools={tools}
              activeTool={activeTool}
              setTool={setTool}
              toolLabels={toolLabels}
              isActive={isActive}
              activeKeyForTool={activeKeyForTool}
              flyoutContentCls={flyoutContentCls}
            />
          )
        }
      </ToolbarRoot>
    </TipProvider>
  )
}

function DesktopToolbar({
  tools,
  activeTool,
  setTool,
  toolLabels,
  isActive,
  activeKeyForTool,
  flyoutContentCls
}: {
  tools: EditorToolDef[]
  activeTool: Tool
  setTool: (tool: Tool) => void
  toolLabels: Record<Tool, string>
  isActive: (tool: EditorToolDef, activeTool: Tool) => boolean
  activeKeyForTool: (tool: EditorToolDef, activeTool: Tool) => Tool
  flyoutContentCls: string
}) {
  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center">
      <div
        data-test-id="toolbar"
        className="flex gap-0.5 rounded-xl border border-border bg-panel p-1 shadow-lg"
      >
        {tools.map((tool) =>
          tool.flyout && tool.flyout.length > 1 ? (
            <div key={tool.key} className="flex items-center">
              <Tip label={`${toolLabels[activeKeyForTool(tool, activeTool)]} (${tool.shortcut})`}>
                <button
                  type="button"
                  data-test-id={`toolbar-tool-${activeKeyForTool(tool, activeTool).toLowerCase()}`}
                  className={`flex size-8 cursor-pointer items-center justify-center rounded-lg border-none transition-colors ${
                    isActive(tool, activeTool)
                      ? 'bg-accent text-white'
                      : 'bg-transparent text-muted hover:bg-hover hover:text-surface'
                  }`}
                  onClick={() => setTool(activeKeyForTool(tool, activeTool))}
                >
                  {(() => {
                    const Icon = toolIcons[activeKeyForTool(tool, activeTool)]
                    return <Icon className="size-4" />
                  })()}
                </button>
              </Tip>

              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    data-test-id={`toolbar-flyout-${tool.key.toLowerCase()}`}
                    className={`flex h-8 w-3 cursor-pointer items-center justify-center rounded-lg border-none transition-colors ${
                      isActive(tool, activeTool)
                        ? 'bg-accent text-white'
                        : 'bg-transparent text-muted hover:bg-hover hover:text-surface'
                    }`}
                  >
                    <ChevronDown className="size-2.5" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    side="top"
                    sideOffset={8}
                    align="start"
                    className={flyoutContentCls}
                  >
                    {tool.flyout.map((sub) => (
                      <ToolbarItem key={sub} tool={sub}>
                        {({ active: subActive, select: selectSub }) => (
                          <DropdownMenu.Item
                            data-test-id={`toolbar-flyout-item-${sub.toLowerCase()}`}
                            className={menu().item({
                              class: subActive ? 'bg-accent text-white' : undefined
                            })}
                            onSelect={selectSub}
                          >
                            {(() => {
                              const Icon = toolIcons[sub]
                              return <Icon className="size-3.5" />
                            })()}
                            <span className="flex-1">{toolLabels[sub]}</span>
                            {toolShortcuts[sub] ? (
                              <span className="text-[11px] text-muted">{toolShortcuts[sub]}</span>
                            ) : null}
                          </DropdownMenu.Item>
                        )}
                      </ToolbarItem>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          ) : (
            <ToolbarItem key={tool.key} tool={tool.key}>
              {({ active, select: selectTool }) => (
                <Tip label={`${toolLabels[tool.key]} (${tool.shortcut})`}>
                  <button
                    type="button"
                    data-test-id={`toolbar-tool-${tool.key.toLowerCase()}`}
                    className={`flex size-8 cursor-pointer items-center justify-center rounded-lg border-none transition-colors ${
                      active
                        ? 'bg-accent text-white'
                        : 'bg-transparent text-muted hover:bg-hover hover:text-surface'
                    }`}
                    onClick={selectTool}
                  >
                    {(() => {
                      const Icon = toolIcons[tool.key]
                      return <Icon className="size-4" />
                    })()}
                  </button>
                </Tip>
              )}
            </ToolbarItem>
          )
        )}
      </div>
    </div>
  )
}

function MobileToolbar({
  tools,
  activeTool,
  setTool,
  toolLabels,
  isActive,
  activeKeyForTool,
  mobileCategory,
  slideDirection,
  hasPrev,
  hasNext,
  goPrev,
  goNext,
  editActions,
  arrangeActions,
  onActionTap,
  flyoutContentCls
}: {
  tools: EditorToolDef[]
  activeTool: Tool
  setTool: (tool: Tool) => void
  toolLabels: Record<Tool, string>
  isActive: (tool: EditorToolDef, activeTool: Tool) => boolean
  activeKeyForTool: (tool: EditorToolDef, activeTool: Tool) => Tool
  mobileCategory: number
  slideDirection: number
  hasPrev: boolean
  hasNext: boolean
  goPrev: () => void
  goNext: () => void
  editActions: ActionItem[]
  arrangeActions: ActionItem[]
  onActionTap: (item: ActionItem) => void
  flyoutContentCls: string
}) {
  return (
    <div
      data-test-id="mobile-toolbar"
      className="fixed left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5"
      style={{
        maxWidth: 'calc(100vw - 2rem)',
        bottom: 'calc(56px + env(safe-area-inset-bottom) + 0.75rem)'
      }}
    >
      <button
        type="button"
        data-test-id="mobile-toolbar-prev"
        className={`flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-panel shadow-sm select-none transition-opacity duration-150 ${
          hasPrev ? 'text-muted opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={goPrev}
      >
        <ChevronLeft className="size-3.5" />
      </button>

      <div
        data-test-id="mobile-toolbar-container"
        className="relative flex h-11 items-center overflow-hidden rounded-[8px] border border-border bg-panel px-2 shadow-lg"
      >
        <div
          key={mobileCategory}
          className="flex gap-0.5 transition-opacity duration-150"
          data-test-id={mobileCategoryTestId(mobileCategory)}
          style={{
            // Preserve slideDirection for future motion; currently category swap is instant.
            opacity: 1,
            ['--slide-dir' as string]: String(slideDirection)
          }}
        >
          {mobileCategory === 0
            ? tools.map((tool) =>
                tool.flyout && tool.flyout.length > 1 ? (
                  <div key={tool.key} className="flex items-center">
                    <button
                      type="button"
                      data-test-id={`mobile-toolbar-tool-${activeKeyForTool(tool, activeTool).toLowerCase()}`}
                      className={`flex size-8 cursor-pointer items-center justify-center rounded-[6px] border-none transition-colors select-none ${
                        isActive(tool, activeTool)
                          ? 'bg-accent text-white'
                          : 'bg-transparent text-muted active:bg-hover'
                      }`}
                      onClick={() => setTool(activeKeyForTool(tool, activeTool))}
                    >
                      {(() => {
                        const Icon = toolIcons[activeKeyForTool(tool, activeTool)]
                        return <Icon className="size-4" />
                      })()}
                    </button>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          data-test-id={`mobile-toolbar-flyout-${tool.key.toLowerCase()}`}
                          className={`flex h-8 w-3 cursor-pointer items-center justify-center rounded-[6px] border-none transition-colors select-none ${
                            isActive(tool, activeTool)
                              ? 'bg-accent text-white'
                              : 'bg-transparent text-muted active:bg-hover'
                          }`}
                        >
                          <ChevronDown className="size-2.5" />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          side="top"
                          sideOffset={8}
                          align="start"
                          className={flyoutContentCls}
                        >
                          {tool.flyout.map((sub) => (
                            <ToolbarItem key={sub} tool={sub}>
                              {({ active: subActive, select: selectSub }) => (
                                <DropdownMenu.Item
                                  data-test-id={`mobile-toolbar-flyout-item-${sub.toLowerCase()}`}
                                  className={menu().item({
                                    class: subActive ? 'bg-accent text-white' : undefined
                                  })}
                                  onSelect={selectSub}
                                >
                                  {(() => {
                                    const Icon = toolIcons[sub]
                                    return <Icon className="size-3.5" />
                                  })()}
                                  <span className="flex-1">{toolLabels[sub]}</span>
                                </DropdownMenu.Item>
                              )}
                            </ToolbarItem>
                          ))}
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
                ) : (
                  <ToolbarItem key={tool.key} tool={tool.key}>
                    {({ active, select: selectTool }) => (
                      <button
                        type="button"
                        data-test-id={`mobile-toolbar-tool-${tool.key.toLowerCase()}`}
                        className={`flex size-8 cursor-pointer items-center justify-center rounded-[6px] border-none transition-colors select-none ${
                          active
                            ? 'bg-accent text-white'
                            : 'bg-transparent text-muted active:bg-hover'
                        }`}
                        onClick={selectTool}
                      >
                        {(() => {
                          const Icon = toolIcons[tool.key]
                          return <Icon className="size-4" />
                        })()}
                      </button>
                    )}
                  </ToolbarItem>
                )
              )
            : null}

          {mobileCategory === 1
            ? editActions.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.label}
                    type="button"
                    data-test-id={`mobile-toolbar-${item.testId}`}
                    className="flex size-8 cursor-pointer items-center justify-center rounded-[6px] border-none bg-transparent text-muted transition-colors select-none active:bg-hover active:text-surface"
                    onClick={() => onActionTap(item)}
                  >
                    <Icon className="size-4" />
                  </button>
                )
              })
            : null}

          {mobileCategory === 2
            ? arrangeActions.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.label}
                    type="button"
                    data-test-id={`mobile-toolbar-${item.testId}`}
                    className="flex size-8 cursor-pointer items-center justify-center rounded-[6px] border-none bg-transparent text-muted transition-colors select-none active:bg-hover active:text-surface"
                    onClick={() => onActionTap(item)}
                  >
                    <Icon className="size-4" />
                  </button>
                )
              })
            : null}
        </div>
      </div>

      <button
        type="button"
        data-test-id="mobile-toolbar-next"
        className={`flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-panel shadow-sm select-none transition-opacity duration-150 ${
          hasNext ? 'text-muted opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={goNext}
      >
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  )
}

export function Toolbar({ editor }: { editor: Editor }) {
  return (
    <EditorBridge editor={editor}>
      <ToolbarInner />
    </EditorBridge>
  )
}
