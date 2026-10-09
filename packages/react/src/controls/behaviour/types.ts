import type { BehaviourKind, InteractionState } from '@open-pencil/scene-graph'

import type { VariantDefinitionControl } from '#react/controls/component-props/authoring'

/** A boolean value of the behaviour: the variant or boolean property that holds it. */
export interface BehaviourBooleanControl {
  id: string
  type: 'boolean'
  required: boolean
  propertyId: string | null
  on?: string
  off?: string
  options: VariantDefinitionControl[]
}

/** A number value of the behaviour, which keeps its own range since Figma has no number property. */
export interface BehaviourNumberControl {
  id: string
  type: 'number'
  min: number
  max: number
  step: number
  default: number
}

/** A text value of the behaviour: the text property that shows it. */
export interface BehaviourTextControl {
  id: string
  type: 'text'
  required: boolean
  propertyId: string | null
  options: VariantDefinitionControl[]
}

export type BehaviourValueControl =
  | BehaviourBooleanControl
  | BehaviourTextControl
  | BehaviourNumberControl

/** One part of the selected component's behaviour: the slot property that is that part. */
export interface BehaviourPartControl {
  id: string
  required: boolean
  propertyId: string | null
  options: VariantDefinitionControl[]
}

/** The variant property that draws interaction states, and the value of each state. */
export interface BehaviourStatesControl {
  propertyId: string | null
  values: Partial<Record<InteractionState, string>>
  options: VariantDefinitionControl[]
}

export interface BehaviourControl {
  kind: BehaviourKind
  values: BehaviourValueControl[]
  parts: BehaviourPartControl[]
  states: BehaviourStatesControl
  missing: string[]
}
