import { PropertyBindingMenu } from '#react/components/properties/component-properties/PropertyBindingMenu'
import { useI18n } from '#react/i18n'

export function SlotPropertyBinding() {
  const { panels } = useI18n()
  return (
    <PropertyBindingMenu
      field="SLOT"
      applyLabel={panels.applySlotProperty}
      detachLabel={panels.detachSlotProperty}
      emptyLabel={panels.noSlotProperties}
    />
  )
}
