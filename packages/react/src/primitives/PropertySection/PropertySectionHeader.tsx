import { memo } from 'react'

import { PropertySectionPart, type PropertySectionPartComponentProps } from '#react/primitives/PropertySection/part'

export const PropertySectionHeader = memo(function PropertySectionHeader(props: Omit<PropertySectionPartComponentProps, 'slot'>) {
  return <PropertySectionPart {...props} slot="header" />
})

PropertySectionHeader.displayName = 'PropertySectionHeader'
