import { InstanceSwapPropertyBinding } from '#react/components/properties/component-properties/InstanceSwapPropertyBinding'
import { SlotInsertControl } from '#react/components/properties/component-properties/SlotInsertControl'
import { PanelFieldGroup } from '#react/components/ui/panel/PanelFieldGroup'
import { useInstanceSwap } from '#react/controls/component-props'
import { useI18n } from '#react/i18n'

export function InstanceSwapSlotField() {
  const { active, preferredValues, onlyPreferredInstances, swap } = useInstanceSwap()
  const { panels } = useI18n()
  if (!active) return null

  return (
    <PanelFieldGroup
      label={panels.instanceSwapSlot}
      className="flex items-center gap-2 border-b border-border px-3 py-2"
      ui={{
        label: 'mb-0 min-w-0 w-24 shrink-0',
        container: 'min-w-0 flex-1 flex-row items-center gap-1'
      }}
    >
      <SlotInsertControl
        propertyId="instance-swap"
        preferredValues={preferredValues}
        onlyPreferredInstances={onlyPreferredInstances}
        onInsert={swap}
      />
      <InstanceSwapPropertyBinding />
    </PanelFieldGroup>
  )
}
