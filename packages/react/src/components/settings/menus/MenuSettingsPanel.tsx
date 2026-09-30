import { useState } from 'react'
import { useStore } from '@nanostores/react'
import { ArrowDown, ArrowUp } from 'lucide-react'

import {
  CONTEXT_MENU_NODE_KINDS,
  moveContextMenuItem,
  resolveContextMenuOrder,
  type ContextMenuItemId,
  type ContextMenuNodeKind
} from '#react/app/settings/context-menu'
import {
  appPreferences,
  resetAllContextMenuOrders,
  resetContextMenuOrder,
  updateContextMenuOrder
} from '#react/app/settings/preferences'
import { SettingsField } from '#react/components/settings/SettingsField'
import { AppButton } from '#react/components/ui/AppButton'
import { useI18n } from '#react/i18n'

function kindLabel(
  kind: ContextMenuNodeKind,
  dialogs: ReturnType<typeof useI18n>['dialogs'],
  tools: ReturnType<typeof useI18n>['tools']
): string {
  switch (kind) {
    case 'default':
      return dialogs.settingsMenuNodeDefault
    case 'FRAME':
      return tools.frame
    case 'SECTION':
      return tools.section
    case 'RECTANGLE':
      return tools.rectangle
    case 'ELLIPSE':
      return tools.ellipse
    case 'LINE':
      return tools.line
    case 'STAR':
      return tools.star
    case 'POLYGON':
      return tools.polygon
    case 'TEXT':
      return tools.text
    case 'GROUP':
      return dialogs.settingsMenuNodeGroup
    case 'VECTOR':
      return dialogs.settingsMenuNodeVector
    case 'BOOLEAN_OPERATION':
      return dialogs.settingsMenuNodeBoolean
    case 'COMPONENT':
      return dialogs.settingsMenuNodeComponent
    case 'COMPONENT_SET':
      return dialogs.settingsMenuNodeComponentSet
    case 'INSTANCE':
      return dialogs.settingsMenuNodeInstance
  }
}

function itemLabel(
  id: ContextMenuItemId,
  commands: ReturnType<typeof useI18n>['commands']
): string {
  switch (id) {
    case 'selection.duplicate':
      return commands.duplicate
    case 'selection.delete':
      return commands.delete
    case 'view.zoomSelection':
      return commands.zoomToSelection
    case 'selection.moveToPageWhenAvailable':
      return commands.moveToPage
    case 'selection.bringForward':
      return commands.bringForward
    case 'selection.bringToFront':
      return commands.bringToFront
    case 'selection.sendBackward':
      return commands.sendBackward
    case 'selection.sendToBack':
      return commands.sendToBack
    case 'selection.group':
      return commands.groupSelection
    case 'selection.frameSelection':
      return commands.frameSelection
    case 'selection.ungroupWhenGroup':
      return commands.ungroup
    case 'selection.wrapInAutoLayout':
      return commands.addAutoLayout
    case 'selection.toggleMask':
      return commands.useAsMask
    case 'selection.flatten':
      return commands.flattenSelection
    case 'selection.outlineText':
      return commands.outlineText
    case 'selection.outlineStroke':
      return commands.outlineStroke
    case 'selection.componentAction':
      return commands.createComponent
    case 'selection.componentSetAction':
      return commands.createComponentSet
    case 'selection.instanceActions':
      return commands.detachInstance
    case 'selection.toggleVisibility':
      return commands.showHide
    case 'selection.toggleLock':
      return commands.lockUnlock
    case 'selection.flipHorizontal':
      return commands.flipHorizontal
    case 'selection.flipVertical':
      return commands.flipVertical
  }
}

export function MenuSettingsPanel() {
  const { dialogs, commands, tools } = useI18n()
  const preferences = useStore(appPreferences)
  const [kind, setKind] = useState<ContextMenuNodeKind>('default')
  const order = resolveContextMenuOrder(kind, preferences.menus.contextByNodeType)
  const isCustom = Boolean(preferences.menus.contextByNodeType[kind])

  return (
    <section className="flex flex-col gap-4" data-test-id="settings-menus-panel">
      <div>
        <h3 className="text-xs font-semibold text-surface">{dialogs.settingsMenus}</h3>
        <p className="mt-1 text-[11px] text-muted">{dialogs.settingsMenusDescription}</p>
      </div>

      <SettingsField label={dialogs.settingsMenusNodeType} htmlFor="settings-menu-node-type">
        <select
          id="settings-menu-node-type"
          data-test-id="settings-menu-node-type"
          className="w-full rounded border border-border bg-transparent px-2 py-1.5 text-xs text-surface outline-none focus:border-accent"
          value={kind}
          onChange={(event) => setKind(event.target.value as ContextMenuNodeKind)}
        >
          {CONTEXT_MENU_NODE_KINDS.map((next) => (
            <option key={next} value={next}>
              {kindLabel(next, dialogs, tools)}
            </option>
          ))}
        </select>
      </SettingsField>

      <div className="flex flex-wrap items-center gap-2">
        <AppButton
          color="neutral"
          variant="ghost"
          size="xs"
          disabled={!isCustom}
          data-test-id="settings-menu-reset"
          onClick={() => resetContextMenuOrder(kind)}
        >
          {dialogs.settingsMenusReset}
        </AppButton>
        <AppButton
          color="neutral"
          variant="ghost"
          size="xs"
          disabled={Object.keys(preferences.menus.contextByNodeType).length === 0}
          data-test-id="settings-menu-reset-all"
          onClick={resetAllContextMenuOrders}
        >
          {dialogs.settingsMenusResetAll}
        </AppButton>
      </div>

      <ol className="flex flex-col divide-y divide-border rounded border border-border">
        {order.map((id, index) => (
          <li
            key={id}
            className="flex items-center gap-2 px-2 py-1.5"
            data-test-id={`settings-menu-item-${id}`}
          >
            <span className="w-5 shrink-0 text-[10px] text-muted">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-surface">
              {itemLabel(id, commands)}
            </span>
            <AppButton
              color="neutral"
              variant="ghost"
              size="xs"
              shape="square"
              disabled={index === 0}
              aria-label={dialogs.settingsMenusMoveUp}
              onClick={() => updateContextMenuOrder(kind, moveContextMenuItem(order, index, -1))}
            >
              <ArrowUp className="size-3" />
            </AppButton>
            <AppButton
              color="neutral"
              variant="ghost"
              size="xs"
              shape="square"
              disabled={index === order.length - 1}
              aria-label={dialogs.settingsMenusMoveDown}
              onClick={() => updateContextMenuOrder(kind, moveContextMenuItem(order, index, 1))}
            >
              <ArrowDown className="size-3" />
            </AppButton>
          </li>
        ))}
      </ol>
      {isCustom ? null : (
        <p className="text-[10px] text-muted">{dialogs.settingsMenusUsingDefault}</p>
      )}
    </section>
  )
}
