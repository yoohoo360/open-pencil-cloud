import { guidToString } from '@open-pencil/fig/node-change'
import type { GUID } from '@open-pencil/kiwi/fig/codec'

import type { ComponentPropAssignment, ComponentPropValue, OverrideContext } from '../types'

export function normalizePropName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function stringToGuidParts(value: string): GUID {
  const [sessionID, localID] = value.split(':').map(Number)
  return { sessionID, localID }
}

export function propTextCharacters(value: ComponentPropValue): string | undefined {
  if (typeof value.textValue === 'string') return value.textValue
  return value.textValue?.characters ?? value.textDataValue?.characters
}

function isEmptyPropValue(v: ComponentPropValue | undefined): boolean {
  if (!v) return true
  return (
    v.boolValue === undefined &&
    v.textValue === undefined &&
    v.textDataValue === undefined &&
    v.guidValue === undefined
  )
}

function resolveAssignmentValue(
  ctx: OverrideContext,
  assignment: ComponentPropAssignment,
  key: string,
  resolveDefaults: boolean
): ComponentPropValue | undefined {
  const value = assignment.value
  if (value && !isEmptyPropValue(value)) return value

  const variableValue = assignment.varValue?.value
  if (variableValue?.symbolIdValue?.guid) return { guidValue: variableValue.symbolIdValue.guid }
  if (variableValue?.boolValue !== undefined) return { boolValue: variableValue.boolValue }
  if (variableValue?.textValue !== undefined) return { textValue: variableValue.textValue }
  if (variableValue?.textDataValue !== undefined)
    return { textDataValue: variableValue.textDataValue }

  return resolveDefaults ? (ctx.propDefaults.get(key) ?? assignment.value) : assignment.value
}

export function assignmentsToValueMap(
  ctx: OverrideContext,
  assignments: ComponentPropAssignment[],
  resolveDefaults = false
): Map<string, ComponentPropValue> {
  const valueByDef = new Map<string, ComponentPropValue>()
  for (const assignment of assignments) {
    if (!assignment.defID) continue
    const key = guidToString(assignment.defID)
    const value = resolveAssignmentValue(ctx, assignment, key, resolveDefaults)
    if (value) valueByDef.set(key, value)
  }
  return valueByDef
}
