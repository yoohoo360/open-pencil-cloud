import * as v from 'valibot'

import type {
  ComponentPropertyDefinition,
  SceneGraph,
  SceneNode
} from '@open-pencil/scene-graph'
import { colorToHex } from '@open-pencil/scene-graph/color'

import { toolNumber } from '#core/tools/input'
import { defineTool } from '#core/tools/schema'

import { detectRole } from './roles'
import { describeLayout, describeVisual } from './summaries'
import { autoDepth, describeInstanceComponent } from './tree'

interface ReusableCandidate {
  id: string
  name: string
  kind: 'component' | 'component-set' | 'instance'
  count: number
}

function suggestedElement(role: string, node: SceneNode): string {
  if (role.startsWith('heading(')) return `h${role.slice(8, -1)}`
  const semantic: Record<string, string> = {
    alert: 'div[role="alert"]',
    article: 'article',
    banner: 'header',
    button: 'button',
    checkbox: 'input[type="checkbox"]',
    combobox: 'select or combobox component',
    complementary: 'aside',
    contentinfo: 'footer',
    dialog: 'dialog',
    img: 'img',
    link: 'a',
    list: 'ul or ol',
    menu: 'menu',
    navigation: 'nav',
    progressbar: 'progress',
    radio: 'input[type="radio"]',
    searchbox: 'input[type="search"]',
    separator: 'hr',
    slider: 'input[type="range"]',
    status: 'span[role="status"]',
    switch: 'button[role="switch"]',
    tab: 'button[role="tab"]',
    tablist: 'div[role="tablist"]',
    textbox: 'input or textarea'
  }
  if (semantic[role]) return semantic[role]
  if (node.type === 'TEXT') return 'p or span'
  if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION') return 'svg'
  return 'div'
}

function layoutTechnique(node: SceneNode): string {
  if (node.layoutMode === 'HORIZONTAL') return 'CSS flex row'
  if (node.layoutMode === 'VERTICAL') return 'CSS flex column'
  if (node.layoutMode === 'GRID') return 'CSS grid'
  if (node.childIds.length > 0) return 'normal flow or positioned container; verify child geometry'
  return 'leaf element'
}

function propertyDefinition(definition: ComponentPropertyDefinition) {
  return {
    name: definition.name,
    type: definition.type,
    defaultValue:
      definition.type === 'BOOLEAN'
        ? definition.defaultValue === 'true'
        : definition.defaultValue,
    options: definition.variantOptions ?? definition.preferredValues,
    description: definition.description || undefined
  }
}

function componentDetails(node: SceneNode, graph: SceneGraph) {
  if (node.type === 'INSTANCE') return describeInstanceComponent(node, graph)
  if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') return undefined
  return {
    kind: node.type === 'COMPONENT_SET' ? 'component-set' : 'component',
    key: node.componentKey || undefined,
    properties: node.componentPropertyDefinitions.map(propertyDefinition),
    variants:
      node.type === 'COMPONENT_SET'
        ? node.childIds
            .map((id) => graph.getNode(id))
            .filter((child): child is SceneNode => child?.type === 'COMPONENT')
            .map((child) => ({ id: child.id, name: child.name }))
        : undefined
  }
}

function visualDetails(node: SceneNode, graph: SceneGraph) {
  return {
    summary: describeVisual(node, graph),
    opacity: node.opacity,
    fills: node.fills
      .filter((fill) => fill.visible)
      .map((fill) => ({
        type: fill.type,
        color: fill.type === 'SOLID' ? colorToHex(fill.color) : undefined,
        opacity: fill.opacity
      })),
    strokes: node.strokes
      .filter((stroke) => stroke.visible)
      .map((stroke) => ({
        color: colorToHex(stroke.color),
        weight: stroke.weight,
        align: stroke.align
      })),
    cornerRadius: node.cornerRadius,
    effects: node.effects.filter((effect) => effect.visible).map((effect) => effect.type)
  }
}

function layoutDetails(node: SceneNode) {
  return {
    summary: describeLayout(node),
    implementation: layoutTechnique(node),
    mode: node.layoutMode,
    positioning: node.layoutPositioning,
    sizing: {
      width: node.width,
      height: node.height,
      mainAxis: node.primaryAxisSizing,
      crossAxis: node.counterAxisSizing,
      grow: node.layoutGrow,
      alignSelf: node.layoutAlignSelf
    },
    position: { x: node.x, y: node.y, rotation: node.rotation },
    alignment: {
      primary: node.primaryAxisAlign,
      counter: node.counterAxisAlign
    },
    gap: { primary: node.itemSpacing, counter: node.counterAxisSpacing },
    padding: {
      top: node.paddingTop,
      right: node.paddingRight,
      bottom: node.paddingBottom,
      left: node.paddingLeft
    },
    wrap: node.layoutWrap,
    constraints: {
      horizontal: node.horizontalConstraint,
      vertical: node.verticalConstraint
    },
    grid:
      node.layoutMode === 'GRID'
        ? {
            columns: node.gridTemplateColumns,
            rows: node.gridTemplateRows,
            columnGap: node.gridColumnGap,
            rowGap: node.gridRowGap,
            position: node.gridPosition
          }
        : undefined
  }
}

function recordReusableCandidate(
  node: SceneNode,
  graph: SceneGraph,
  candidates: Map<string, ReusableCandidate>
) {
  if (node.type === 'INSTANCE') {
    const component = node.componentId ? graph.getNode(node.componentId) : undefined
    const id = component?.id ?? node.componentId ?? node.id
    const existing = candidates.get(id)
    if (existing) existing.count += 1
    else {
      candidates.set(id, {
        id,
        name: component?.name ?? node.name,
        kind: 'instance',
        count: 1
      })
    }
    return
  }
  if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') return
  if (candidates.has(node.id)) return
  candidates.set(node.id, {
    id: node.id,
    name: node.name,
    kind: node.type === 'COMPONENT_SET' ? 'component-set' : 'component',
    count: 1
  })
}

function analyzeNode(
  node: SceneNode,
  graph: SceneGraph,
  depth: number,
  candidates: Map<string, ReusableCandidate>,
  texts: Array<{ id: string; name: string; text: string }>
): Record<string, unknown> {
  recordReusableCandidate(node, graph, candidates)
  if (node.type === 'TEXT' && node.text) texts.push({ id: node.id, name: node.name, text: node.text })

  const role = detectRole(node)
  const children =
    depth > 0
      ? node.childIds
          .map((id) => graph.getNode(id))
          .filter((child): child is SceneNode => Boolean(child?.visible))
          .map((child) => analyzeNode(child, graph, depth - 1, candidates, texts))
      : []
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    role,
    suggestedElement: suggestedElement(role, node),
    content: node.type === 'TEXT' ? node.text : undefined,
    layout: layoutDetails(node),
    visual: visualDetails(node, graph),
    typography:
      node.type === 'TEXT'
        ? {
            fontFamily: node.fontFamily,
            fontSize: node.fontSize,
            fontWeight: node.fontWeight,
            italic: node.italic,
            lineHeight: node.lineHeight,
            letterSpacing: node.letterSpacing,
            horizontalAlign: node.textAlignHorizontal,
            verticalAlign: node.textAlignVertical,
            resize: node.textAutoResize,
            maxLines: node.maxLines
          }
        : undefined,
    component: componentDetails(node, graph),
    children: children.length > 0 ? children : undefined,
    childrenTruncated: depth === 0 && node.childIds.length > 0 ? node.childIds.length : undefined
  }
}

export const describeSelectionForCode = defineTool({
  name: 'describe_selection_for_code',
  description:
    'Analyze the current selection and its visible descendants before frontend implementation. Returns hierarchy, geometry, layout, visual styles, exact text, component properties, reusable candidates, and an implementation order. Use this before planning or generating code from a prototype.',
  execution: { kind: 'sync', mutation: 'none' },
  exposure: { ai: false, webmcp: false },
  input: v.object({
    depth: v.optional(
      toolNumber(
        v.pipe(
          v.number(),
          v.minValue(1),
          v.maxValue(5),
          v.description('Visible descendant depth to inspect (auto if omitted, max: 5)')
        )
      )
    )
  }),
  execute: (figma, args) => {
    const selected = figma.currentPage.selection
      .map((item) => figma.graph.getNode(item.id))
      .filter((node): node is SceneNode => Boolean(node))
    if (selected.length === 0) return { error: 'No nodes selected' }

    const candidates = new Map<string, ReusableCandidate>()
    const texts: Array<{ id: string; name: string; text: string }> = []
    const nodes = selected.map((node) => {
      const depth = Math.min(args.depth ?? autoDepth(figma.graph, node.id), 5)
      return analyzeNode(node, figma.graph, depth, candidates, texts)
    })

    return {
      scope: 'current selection',
      selectedNodeIds: selected.map((node) => node.id),
      implementationOrder: [
        'Establish the selected root containers and their sizing constraints.',
        'Implement layout from outer regions to inner rows, columns, grids, and positioned layers.',
        'Extract repeated components and map their variants, states, slots, and overrides to props.',
        'Add exact visible content and typography.',
        'Apply fills, borders, radii, effects, spacing, and alignment.',
        'Add only interactions and responsive behavior explicitly supported by the design.'
      ],
      reusableCandidates: [...candidates.values()],
      visibleText: texts,
      nodes
    }
  }
})
