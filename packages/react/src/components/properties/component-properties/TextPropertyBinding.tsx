import { PropertyBindingMenu } from '#react/components/properties/component-properties/PropertyBindingMenu'
import { useI18n } from '#react/i18n'

export function TextPropertyBinding() {
  const { panels } = useI18n()
  return (
    <PropertyBindingMenu
      field="TEXT"
      applyLabel={panels.applyTextProperty}
      detachLabel={panels.detachTextProperty}
      emptyLabel={panels.noTextProperties}
    />
  )
}
