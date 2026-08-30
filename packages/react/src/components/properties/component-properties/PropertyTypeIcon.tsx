import { Component, Diamond, SquareDashed, ToggleLeft, Type } from 'lucide-react'
import type { ComponentPropertyType } from '@open-pencil/scene-graph'

import { useI18n } from '#react/i18n'

const PROPERTY_TYPE_ICONS = {
  VARIANT: Diamond,
  BOOLEAN: ToggleLeft,
  TEXT: Type,
  INSTANCE_SWAP: Component,
  SLOT: SquareDashed
} as const

type PropertyTypePanels = ReturnType<typeof useI18n>['panels']

export function propertyTypeLabel(type: ComponentPropertyType, panels: PropertyTypePanels) {
  const labels = {
    VARIANT: panels.propertyTypeVariant,
    BOOLEAN: panels.propertyTypeBoolean,
    TEXT: panels.propertyTypeText,
    INSTANCE_SWAP: panels.propertyTypeInstanceSwap,
    SLOT: panels.propertyTypeSlot
  }
  return labels[type]
}

export function propertyBindingTooltip(
  type: ComponentPropertyType,
  panels: PropertyTypePanels,
  boundLayerNames?: readonly string[]
) {
  if (boundLayerNames && boundLayerNames.length > 0) {
    return panels.appliedToLayer({ name: boundLayerNames.join(', ') })
  }
  return propertyTypeLabel(type, panels)
}

export function PropertyTypeIcon({
  type,
  className = 'size-3 shrink-0 text-component'
}: {
  type: ComponentPropertyType
  className?: string
}) {
  const { panels } = useI18n()
  const Icon = PROPERTY_TYPE_ICONS[type]
  return <Icon className={className} aria-label={propertyTypeLabel(type, panels)} />
}
