import { PropertyBindingMenu } from '#react/components/properties/component-properties/PropertyBindingMenu'
import { useI18n } from '#react/i18n'

export function InstanceSwapPropertyBinding() {
  const { panels } = useI18n()
  return (
    <PropertyBindingMenu
      field="INSTANCE_SWAP"
      applyLabel={panels.applyInstanceSwapProperty}
      detachLabel={panels.detachInstanceSwapProperty}
      emptyLabel={panels.noInstanceSwapProperties}
    />
  )
}
