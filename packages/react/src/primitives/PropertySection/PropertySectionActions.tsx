import { memo } from 'react'

import { PropertySectionPart, type PropertySectionPartComponentProps } from '#react/primitives/PropertySection/part'

export const PropertySectionActions = memo(function PropertySectionActions(props: Omit<PropertySectionPartComponentProps, 'slot'>) {
  return <PropertySectionPart {...props} slot="actions" />
})

PropertySectionActions.displayName = 'PropertySectionActions'
