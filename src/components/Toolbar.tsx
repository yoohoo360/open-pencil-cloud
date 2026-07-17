<script setup lang="ts">
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal
} from 'reka-ui'
import { AnimatePresence, motion } from 'motion-v'

import IconChevronDown from '~icons/lucide/chevron-down'
import IconChevronLeft from '~icons/lucide/chevron-left'
import IconChevronRight from '~icons/lucide/chevron-right'
import IconCopy from '~icons/lucide/copy'
import IconClipboard from '~icons/lucide/clipboard'
import IconScissors from '~icons/lucide/scissors'
import IconCopyPlus from '~icons/lucide/copy-plus'
import IconTrash2 from '~icons/lucide/trash-2'
import IconArrowUpToLine from '~icons/lucide/arrow-up-to-line'
import IconArrowDownToLine from '~icons/lucide/arrow-down-to-line'
import IconGroup from '~icons/lucide/group'
import IconUngroup from '~icons/lucide/ungroup'
import IconLock from '~icons/lucide/lock'

import { menu, useMenuUI } from '@/components/ui/menu'
import Tip from '@/components/ui/Tip.vue'
import { useActionToast } from '@/composables/use-action-toast'
import { useEditorStore } from '@/stores/editor'
import { toolIcons } from '@/utils/tools'
import {
  ToolbarRoot,
  ToolbarItem,
  useEditorCommands,
  useI18n,
  useToolbarState,
  useViewportKind
} from '@open-pencil/vue'
import { computed } from 'vue'

import type { Component } from 'vue'
import type { Tool } from '@open-pencil/vue'

const store = useEditorStore()
const { isMobile } = useViewportKind()
const { getCommand } = useEditorCommands()
const { showActionToast } = useActionToast()
const { menu: t, tools: toolTexts } = useI18n()

const toolLabels = computed<Record<Tool, string>>(() => ({
  SELECT: toolTexts.value.move,
  FRAME: toolTexts.value.frame,
  SECTION: toolTexts.value.section,
  RECTANGLE: toolTexts.value.rectangle,
  ELLIPSE: toolTexts.value.ellipse,
  LINE: toolTexts.value.line,
  POLYGON: toolTexts.value.polygon,
  STAR: toolTexts.value.star,
  PEN: toolTexts.value.pen,
  TEXT: toolTexts.value.text,
  HAND: toolTexts.value.hand
}))

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

interface ActionItem {
  icon: Component
  label: string
  action: () => void
}

const flyoutMenuCls = useMenuUI({ content: 'min-w-32' })

const editActions = computed<ActionItem[]>(() => [
  { icon: IconCopy, label: t.value.copy, action: () => store.mobileCopy() },
  { icon: IconClipboard, label: t.value.paste, action: () => store.mobilePaste() },
  { icon: IconScissors, label: t.value.cut, action: () => store.mobileCut() },
  {
    icon: IconCopyPlus,
    label: getCommand('selection.duplicate').label,
    action: () => getCommand('selection.duplicate').run()
  },
  {
    icon: IconTrash2,
    label: getCommand('selection.delete').label,
    action: () => getCommand('selection.delete').run()
  }
])

const arrangeActions = computed<ActionItem[]>(() => [
  {
    icon: IconArrowUpToLine,
    label: t.value.front,
    action: () => getCommand('selection.bringToFront').run()
  },
  {
    icon: IconArrowDownToLine,
    label: t.value.back,
    action: () => getCommand('selection.sendToBack').run()
  },
  {
    icon: IconGroup,
    label: getCommand('selection.group').label,
    action: () => getCommand('selection.group').run()
  },
  {
    icon: IconUngroup,
    label: getCommand('selection.ungroup').label,
    action: () => getCommand('selection.ungroup').run()
  },
  {
    icon: IconLock,
    label: t.value.lock,
    action: () => getCommand('selection.toggleLock').run()
  }
])

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

function onActionTap(item: ActionItem) {
  item.action()
  showActionToast(item.label)
}

const slideVariants = {
  initial: (dir: unknown) => ({ opacity: 0, x: (dir as number) * 20 }),
  animate: { opacity: 1, x: 0 },
  exit: (dir: unknown) => ({ opacity: 0, x: (dir as number) * -20 })
}
</script>

<template>
  <ToolbarRoot v-slot="{ tools, activeTool, setTool }">
    <div
      v-if="!isMobile"
      class="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center"
    >
      <div
        data-test-id="toolbar"
        class="flex gap-0.5 rounded-xl border border-border bg-panel p-1 shadow-lg"
      >
        <template v-for="tool in tools" :key="tool.key">
          <div v-if="tool.flyout && tool.flyout.length > 1" class="flex items-center">
            <Tip :label="`${toolLabels[activeKeyForTool(tool, activeTool)]} (${tool.shortcut})`">
              <button
                :data-test-id="`toolbar-tool-${activeKeyForTool(tool, activeTool).toLowerCase()}`"
                class="flex size-8 cursor-pointer items-center justify-center rounded-lg border-none transition-colors"
                :class="
                  isActive(tool, activeTool)
                    ? 'bg-accent text-white'
                    : 'bg-transparent text-muted hover:bg-hover hover:text-surface'
                "
                @click="setTool(activeKeyForTool(tool, activeTool))"
              >
                <component :is="toolIcons[activeKeyForTool(tool, activeTool)]" class="size-4" />
              </button>
            </Tip>

            <DropdownMenuRoot>
              <DropdownMenuTrigger as-child>
                <button
                  :data-test-id="`toolbar-flyout-${tool.key.toLowerCase()}`"
                  class="flex h-8 w-3 cursor-pointer items-center justify-center rounded-lg border-none transition-colors"
                  :class="
                    isActive(tool, activeTool)
                      ? 'bg-accent text-white'
                      : 'bg-transparent text-muted hover:bg-hover hover:text-surface'
                  "
                >
                  <IconChevronDown class="size-2.5" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuPortal>
                <DropdownMenuContent
                  side="top"
                  :side-offset="8"
                  align="start"
                  :class="flyoutMenuCls.content"
                >
                  <ToolbarItem
                    v-for="sub in tool.flyout"
                    :key="sub"
                    v-slot="{ active: subActive, select: selectSub }"
                    :tool="sub"
                  >
                    <DropdownMenuItem
                      :data-test-id="`toolbar-flyout-item-${sub.toLowerCase()}`"
                      :class="
                        menu().item({ class: subActive ? 'bg-accent text-white' : undefined })
                      "
                      @select="selectSub"
                    >
                      <component :is="toolIcons[sub]" class="size-3.5" />
                      <span class="flex-1">{{ toolLabels[sub] }}</span>
                      <span v-if="toolShortcuts[sub]" class="text-[11px] text-muted">{{
                        toolShortcuts[sub]
                      }}</span>
                    </DropdownMenuItem>
                  </ToolbarItem>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenuRoot>
          </div>

          <ToolbarItem v-else v-slot="{ active, select: selectTool }" :tool="tool.key">
            <Tip :label="`${toolLabels[tool.key]} (${tool.shortcut})`">
              <button
                :data-test-id="`toolbar-tool-${tool.key.toLowerCase()}`"
                class="flex size-8 cursor-pointer items-center justify-center rounded-lg border-none transition-colors"
                :class="
                  active
                    ? 'bg-accent text-white'
                    : 'bg-transparent text-muted hover:bg-hover hover:text-surface'
                "
                @click="selectTool"
              >
                <component :is="toolIcons[tool.key]" class="size-4" />
              </button>
            </Tip>
          </ToolbarItem>
        </template>
      </div>
    </div>

    <!-- Mobile toolbar -->
    <div
      v-else
      data-test-id="mobile-toolbar"
      class="fixed left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5"
      :style="{
        maxWidth: 'calc(100vw - 2rem)',
        bottom: `calc(56px + env(safe-area-inset-bottom) + 0.75rem)`
      }"
    >
      <motion.button
        data-test-id="mobile-toolbar-prev"
        class="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-panel shadow-sm select-none"
        :class="hasPrev ? 'text-muted' : 'pointer-events-none'"
        :animate="{ opacity: hasPrev ? 1 : 0 }"
        :transition="{ duration: 0.15 }"
        @click="goPrev"
      >
        <IconChevronLeft class="size-3.5" />
      </motion.button>

      <motion.div
        layout
        data-test-id="mobile-toolbar-container"
        class="relative flex h-11 items-center overflow-hidden rounded-[8px] border border-border bg-panel px-2 shadow-lg"
        :transition="{ layout: { type: 'spring', damping: 30, stiffness: 500 } }"
      >
        <AnimatePresence mode="popLayout" :custom="slideDirection">
          <motion.div
            v-if="mobileCategory === 0"
            key="tools"
            data-test-id="mobile-toolbar-tools"
            class="flex gap-0.5"
            :variants="slideVariants"
            initial="initial"
            animate="animate"
            exit="exit"
            :transition="{ duration: 0.15 }"
          >
            <template v-for="tool in tools" :key="tool.key">
              <div v-if="tool.flyout && tool.flyout.length > 1" class="flex items-center">
                <button
                  :data-test-id="`mobile-toolbar-tool-${activeKeyForTool(tool, activeTool).toLowerCase()}`"
                  class="flex size-8 cursor-pointer items-center justify-center rounded-[6px] border-none transition-colors select-none"
                  :class="
                    isActive(tool, activeTool)
                      ? 'bg-accent text-white'
                      : 'bg-transparent text-muted active:bg-hover'
                  "
                  @click="setTool(activeKeyForTool(tool, activeTool))"
                >
                  <component :is="toolIcons[activeKeyForTool(tool, activeTool)]" class="size-4" />
                </button>

                <DropdownMenuRoot>
                  <DropdownMenuTrigger as-child>
                    <button
                      :data-test-id="`mobile-toolbar-flyout-${tool.key.toLowerCase()}`"
                      class="flex h-8 w-3 cursor-pointer items-center justify-center rounded-[6px] border-none transition-colors select-none"
                      :class="
                        isActive(tool, activeTool)
                          ? 'bg-accent text-white'
                          : 'bg-transparent text-muted active:bg-hover'
                      "
                    >
                      <IconChevronDown class="size-2.5" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuPortal>
                    <DropdownMenuContent
                      side="top"
                      :side-offset="8"
                      align="start"
                      :class="flyoutMenuCls.content"
                    >
                      <ToolbarItem
                        v-for="sub in tool.flyout"
                        :key="sub"
                        v-slot="{ active: subActive, select: selectSub }"
                        :tool="sub"
                      >
                        <DropdownMenuItem
                          :data-test-id="`mobile-toolbar-flyout-item-${sub.toLowerCase()}`"
                          :class="
                            menu().item({ class: subActive ? 'bg-accent text-white' : undefined })
                          "
                          @select="selectSub"
                        >
                          <component :is="toolIcons[sub]" class="size-3.5" />
                          <span class="flex-1">{{ toolLabels[sub] }}</span>
                        </DropdownMenuItem>
                      </ToolbarItem>
                    </DropdownMenuContent>
                  </DropdownMenuPortal>
                </DropdownMenuRoot>
              </div>

              <ToolbarItem v-else v-slot="{ active, select: selectTool }" :tool="tool.key">
                <button
                  :data-test-id="`mobile-toolbar-tool-${tool.key.toLowerCase()}`"
                  class="flex size-8 cursor-pointer items-center justify-center rounded-[6px] border-none transition-colors select-none"
                  :class="
                    active ? 'bg-accent text-white' : 'bg-transparent text-muted active:bg-hover'
                  "
                  @click="selectTool"
                >
                  <component :is="toolIcons[tool.key]" class="size-4" />
                </button>
              </ToolbarItem>
            </template>
          </motion.div>

          <motion.div
            v-else-if="mobileCategory === 1"
            key="edit"
            data-test-id="mobile-toolbar-edit"
            class="flex gap-0.5"
            :variants="slideVariants"
            initial="initial"
            animate="animate"
            exit="exit"
            :transition="{ duration: 0.15 }"
          >
            <button
              v-for="item in editActions"
              :key="item.label"
              :data-test-id="`mobile-toolbar-${item.label.toLowerCase()}`"
              class="flex size-8 cursor-pointer items-center justify-center rounded-[6px] border-none bg-transparent text-muted transition-colors select-none active:bg-hover active:text-surface"
              @click="onActionTap(item)"
            >
              <component :is="item.icon" class="size-4" />
            </button>
          </motion.div>

          <motion.div
            v-else
            key="arrange"
            data-test-id="mobile-toolbar-arrange"
            class="flex gap-0.5"
            :variants="slideVariants"
            initial="initial"
            animate="animate"
            exit="exit"
            :transition="{ duration: 0.15 }"
          >
            <button
              v-for="item in arrangeActions"
              :key="item.label"
              :data-test-id="`mobile-toolbar-${item.label.toLowerCase()}`"
              class="flex size-8 cursor-pointer items-center justify-center rounded-[6px] border-none bg-transparent text-muted transition-colors select-none active:bg-hover active:text-surface"
              @click="onActionTap(item)"
            >
              <component :is="item.icon" class="size-4" />
            </button>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <motion.button
        data-test-id="mobile-toolbar-next"
        class="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-panel shadow-sm select-none"
        :class="hasNext ? 'text-muted' : 'pointer-events-none'"
        :animate="{ opacity: hasNext ? 1 : 0 }"
        :transition="{ duration: 0.15 }"
        @click="goNext"
      >
        <IconChevronRight class="size-3.5" />
      </motion.button>
    </div>
  </ToolbarRoot>
</template>
