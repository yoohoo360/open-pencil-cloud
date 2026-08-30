import { SlotPropertyBinding } from '#react/components/properties/component-properties/SlotPropertyBinding'
import { PanelFieldGroup } from '#react/components/ui/panel/PanelFieldGroup'
import { useSlotPropertyBinding } from '#react/controls/component-props'
import { useI18n } from '#react/i18n'

export function SlotBindField() {
  const { active, boundName } = useSlotPropertyBinding()
  const { panels } = useI18n()
  if (!active) return null

  return (
    <PanelFieldGroup
      label={panels.instanceSwapSlot}
      className="border-b border-border px-3 py-2"
      ui={{ container: 'flex min-w-0 flex-row items-center gap-1' }}
    >
      <span className="min-w-0 flex-1 truncate text-[11px] text-surface">
        {boundName ?? panels.applySlotProperty}
      </span>
      <SlotPropertyBinding />
    </PanelFieldGroup>
  )
}
