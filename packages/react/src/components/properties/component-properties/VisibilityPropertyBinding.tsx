import { PropertyBindingMenu } from '#react/components/properties/component-properties/PropertyBindingMenu'
import { useI18n } from '#react/i18n'

export function VisibilityPropertyBinding() {
  const { panels } = useI18n()
  return (
    <PropertyBindingMenu
      field="VISIBLE"
      applyLabel={panels.applyBooleanProperty}
      detachLabel={panels.detachBooleanProperty}
      emptyLabel={panels.noBooleanProperties}
    />
  )
}
