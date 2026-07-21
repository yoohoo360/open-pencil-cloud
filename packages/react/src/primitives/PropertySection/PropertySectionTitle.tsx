import { memo } from 'react'

import { PropertySectionPart, type PropertySectionPartComponentProps } from '#react/primitives/PropertySection/part'

export const PropertySectionTitle = memo(function PropertySectionTitle(props: Omit<PropertySectionPartComponentProps, 'slot'>) {
  return <PropertySectionPart {...props} slot="title" />
})

PropertySectionTitle.displayName = 'PropertySectionTitle'
