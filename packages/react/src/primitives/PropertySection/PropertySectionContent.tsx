import { memo } from 'react'

import { PropertySectionPart, type PropertySectionPartComponentProps } from '#react/primitives/PropertySection/part'
import { usePropertySection } from '#react/primitives/PropertySection/context'

export const PropertySectionContent = memo(function PropertySectionContent(props: Omit<PropertySectionPartComponentProps, 'slot'>) {
  const context = usePropertySection()
  if (!context.open && context.unmountOnHide) return null
  return <PropertySectionPart {...props} slot="content" hidden={!context.open} />
})

PropertySectionContent.displayName = 'PropertySectionContent'
