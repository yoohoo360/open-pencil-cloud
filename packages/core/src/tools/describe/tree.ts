import {
  componentPropertyDefinitions,
  instanceMainComponent,
  resolveComponentPropertyValue,
  type ComponentPropertyDefinition,
  type SceneGraph,
  type SceneNode
} from '@open-pencil/scene-graph'

import { detectIssues } from './issues'
import type { DescribeIssue } from './issues'
import { detectRole } from './roles'
import { describeLayout, describeVisual, summarizeContainer, summarizeText } from './summaries'

interface ChildDescription {
  role: string
  name: string
  summary: string
  id: string
  component?: InstanceComponentDescription
  issues?: DescribeIssue[]
  children?: ChildDescription[]
}

export interface InstanceComponentPropertyDescription {
  id: string
  name: string
  type: ComponentPropertyDefinition['type']
  value: string | boolean
  defaultValue: string | boolean
  overridden: boolean
  options?: string[]
  description?: string
  resolvedValue?: { id: string; name: string; type: string }
}

export interface InstanceComponentDescription {
  mainComponent: { id: string; name: string } | null
  properties: InstanceComponentPropertyDescription[]
}

function componentPropertyValue(
  definition: ComponentPropertyDefinition,
  value: string
): string | boolean {
  return definition.type === 'BOOLEAN' ? value === 'true' : value
}

export function describeInstanceComponent(
  node: SceneNode,
  graph: SceneGraph
): InstanceComponentDescription | undefined {
  if (node.type !== 'INSTANCE') return undefined
  const mainComponent = instanceMainComponent(graph, node)
  const properties = componentPropertyDefinitions(graph, node).map((definition) => {
    const assigned = node.componentPropertyAssignments[definition.id]
    const variantValue =
      definition.type === 'VARIANT'
        ? mainComponent?.componentPropertyValues[definition.name]
        : undefined
    const rawValue = assigned ?? variantValue ?? definition.defaultValue
    const result: InstanceComponentPropertyDescription = {
      id: definition.id,
      name: definition.name,
      type: definition.type,
      value: componentPropertyValue(definition, rawValue),
      defaultValue: componentPropertyValue(definition, definition.defaultValue),
      overridden: assigned !== undefined || rawValue !== definition.defaultValue
    }
    const options = definition.variantOptions ?? definition.preferredValues
    if (options) result.options = [...options]
    if (definition.description) result.description = definition.description
    if (definition.type === 'INSTANCE_SWAP') {
      const resolved = resolveComponentPropertyValue(graph, rawValue)
      if (resolved) {
        result.resolvedValue = { id: resolved.id, name: resolved.name, type: resolved.type }
      }
    }
    return result
  })
  return {
    mainComponent: mainComponent ? { id: mainComponent.id, name: mainComponent.name } : null,
    properties
  }
}

function describeChild(
  node: SceneNode,
  graph: SceneGraph,
  depth: number,
  gridSize: number
): ChildDescription {
  const role = detectRole(node)
  const summary =
    node.type === 'TEXT' ? summarizeText(node, graph) : summarizeContainer(node, graph)
  const result: ChildDescription = { role, name: node.name, summary, id: node.id }

  const component = describeInstanceComponent(node, graph)
  if (component) result.component = component

  const issues = detectIssues(node, gridSize, graph)
  if (issues.length > 0) result.issues = issues

  if (depth > 0 && node.childIds.length > 0) {
    const kids: ChildDescription[] = []
    for (const childId of node.childIds) {
      const child = graph.getNode(childId)
      if (!child || !child.visible) continue
      kids.push(describeChild(child, graph, depth - 1, gridSize))
    }
    if (kids.length > 0) result.children = kids
  }
  return result
}

export function describeOneNode(
  figma: { graph: SceneGraph },
  nodeId: string,
  depth: number,
  gridSize: number
): Record<string, unknown> {
  const raw = figma.graph.getNode(nodeId)
  if (!raw) return { id: nodeId, error: `Node "${nodeId}" not found` }

  const role = detectRole(raw)
  const visual = describeVisual(raw, figma.graph)
  const layout = describeLayout(raw)
  const issues = detectIssues(raw, gridSize, figma.graph)

  const children: ChildDescription[] = []
  for (const childId of raw.childIds) {
    const child = figma.graph.getNode(childId)
    if (!child || !child.visible) continue
    children.push(describeChild(child, figma.graph, depth - 1, gridSize))
  }

  const result: Record<string, unknown> = {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    role,
    size: `${raw.width}×${raw.height}`,
    visual
  }
  const component = describeInstanceComponent(raw, figma.graph)
  if (component) result.component = component
  if (layout) result.layout = layout
  if (children.length > 0) result.children = children
  if (issues.length > 0) result.issues = issues
  return result
}

function countDescendants(graph: SceneGraph, nodeId: string): number {
  const node = graph.getNode(nodeId)
  if (!node) return 0
  let count = 0
  for (const childId of node.childIds) {
    count += 1 + countDescendants(graph, childId)
  }
  return count
}

export function autoDepth(graph: SceneGraph, nodeId: string): number {
  const size = countDescendants(graph, nodeId)
  if (size <= 15) return 4
  if (size <= 40) return 3
  if (size <= 100) return 2
  return 1
}
