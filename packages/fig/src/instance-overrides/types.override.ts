import type { GUID, NodeChange, VariableConsumptionEntry } from '@open-pencil/kiwi/fig/codec'
import { isUnsetGuid, UNSET_GUID } from '@open-pencil/kiwi/fig/guid'
import type { SceneGraph } from '@open-pencil/scene-graph'
import type { Matrix, Vector } from '@open-pencil/scene-graph/primitives'

import type { ProtectionMap } from './patches'

export interface VariableConsumptionMapFields {
  variableConsumptionMap?: { entries?: VariableConsumptionEntry[] }
  [key: string]: unknown
}

export interface SymbolOverride extends VariableConsumptionMapFields {
  guidPath?: { guids?: GUID[] }
  overriddenSymbolID?: GUID
  componentPropAssignments?: ComponentPropAssignment[]
}

export type SymbolOverrideFields = VariableConsumptionMapFields

export interface SymbolData {
  uniformScaleFactor?: number
  symbolID?: GUID
  symbolOverrides?: SymbolOverride[]
}

/** The Kiwi codec types only `symbolID`; the remaining symbol fields are read through here. */
export function symbolDataOf(record: NodeChange): SymbolData | undefined {
  return record.symbolData as SymbolData | undefined
}

export function symbolOverridesOf(record: NodeChange): readonly SymbolOverride[] {
  return symbolDataOf(record)?.symbolOverrides ?? []
}

export function uniformScaleOf(record: NodeChange): number {
  return symbolDataOf(record)?.uniformScaleFactor ?? 1
}

/** A record's saved override payloads are partial records; visit the record and all of them. */
export function forEachOverrideRecord(
  record: NodeChange,
  visit: (record: NodeChange, override?: SymbolOverride) => void,
  override?: SymbolOverride
): void {
  visit(record, override)
  for (const nested of symbolOverridesOf(record))
    forEachOverrideRecord(nested as NodeChange, visit, nested)
}

export interface ComponentPropRef {
  defID?: GUID
  componentPropNodeField: string
}

export type ComponentPropTextValue = string | { characters?: string }

export type ComponentPropValue = {
  boolValue?: boolean
  textValue?: ComponentPropTextValue
  textDataValue?: { characters?: string }
  guidValue?: GUID
  /** A slot's content frame; the all-ones GUID means the component's own content. */
  slotContentIdValue?: { guid?: GUID }
}

/** Figma's slot value for "the component's own content", the default of every slot property. */
export const DEFAULT_SLOT_CONTENT: Readonly<GUID> = UNSET_GUID

/** The content frame a slot value names, unless it names the component's own content. */
export function assignedSlotContent(value: ComponentPropValue | undefined): GUID | undefined {
  const guid = value?.slotContentIdValue?.guid
  if (!guid) return undefined
  return isUnsetGuid(guid) ? undefined : guid
}

export interface ComponentPropAssignment {
  defID?: GUID
  value?: ComponentPropValue
  varValue?: {
    value?: {
      boolValue?: boolean
      textValue?: string
      textDataValue?: { characters?: string }
      symbolIdValue?: { guid?: GUID }
      slotContentIdValue?: { guid?: GUID }
    }
  }
}

export interface DerivedSymbolOverride {
  guidPath?: { guids?: GUID[] }
  size?: Vector
  transform?: Matrix
  fontSize?: number
  lineHeight?: NodeChange['lineHeight']
  letterSpacing?: NodeChange['letterSpacing']
  strokeWeight?: number
  derivedTextData?: NodeChange['derivedTextData']
  vectorData?: NodeChange['vectorData']
  fillGeometry?: NodeChange['fillGeometry']
  strokeGeometry?: NodeChange['strokeGeometry']
}

export interface ComponentPropDef {
  id?: GUID
  name?: string
  initialValue?: ComponentPropValue
  type?: number
}

export interface InstanceNodeChange {
  type?: string
  name?: string
  guid?: GUID
  parentIndex?: { guid?: GUID }
  transform?: Matrix
  size?: Vector
  overrideKey?: GUID
  symbolData?: SymbolData
  componentPropRefs?: ComponentPropRef[]
  componentPropAssignments?: ComponentPropAssignment[]
  componentPropDefs?: ComponentPropDef[]
  styleType?: string
  fillPaints?: NodeChange['fillPaints']
  strokePaints?: NodeChange['strokePaints']
  fillGeometry?: NodeChange['fillGeometry']
  strokeGeometry?: NodeChange['strokeGeometry']
  strokeWeight?: number
  derivedSymbolData?: DerivedSymbolOverride[]
  key?: string
  version?: string
  userFacingVersion?: string
  variableDataValues?: NodeChange['variableDataValues']
}

/**
 * Shared state for override resolution.
 *
 * Built once in `populateAndApplyOverrides` and threaded through all
 * sub-functions. Avoids closure-based coupling (a single 700-line
 * function) while keeping the shared maps accessible.
 */
export interface OverrideContext {
  graph: SceneGraph
  changeMap: Map<string, InstanceNodeChange>
  guidToNodeId: Map<string, string>
  blobs: Uint8Array[]

  overrideKeyToGuid: Map<string, string>
  assetRefToGuid: Map<string, string>
  nodeIdToGuid: Map<string, string>
  propDefaults: Map<string, ComponentPropValue>
  propNames: Map<string, string>
  componentPropRefsMap?: Map<string, ComponentPropRef[]>
  componentPropAssignmentsMap?: Map<string, ComponentPropAssignment[]>
  preComputedRoot: Map<string, string>
  preComputedClones: Map<string, string[]>
  componentIdRoot: Map<string, string>
  swappedInstances: Set<string>
  protectedFields: ProtectionMap
  /** Nodes whose kiwi NC has explicit property values (cornerRadius, visibility, etc.) */
  kiwiPropertyNodes: Set<string>
  /** Nodes whose Figma-derived geometry should not be overwritten by clone propagation. */
  geometryOverrideNodes: Set<string>
  /** When set, apply/populate expensive instance work only inside these already-imported nodes. */
  activeNodeIds?: Set<string>
  /**
   * Active INSTANCE NodeChanges already resolved to graph ids. Page populate
   * walks this instead of rescanning the whole-document changeMap.
   */
  activeInstanceEntries: Array<[string, InstanceNodeChange]>
  /** Cached `buildClonesMap` result; cleared when late expansion adds nodes. */
  clonesOf?: Map<string, string[]>
}
