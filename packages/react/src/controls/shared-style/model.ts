import { BLACK, DEFAULT_FONT_FAMILY, DEFAULT_SHAPE_FILL } from '@open-pencil/core/constants'
import { colorToHex } from '@open-pencil/core/color'
import {
  copyEffects,
  copyFills,
  copyLayoutGrids,
  FONT_WEIGHT_NAMES,
  sharedStyleRefKey,
  sharedStyleTypeForKind,
  type Effect,
  type NodeType,
  type SceneNode,
  type SharedStyle,
  type SharedStyleKind,
  type SharedStyleType
} from '@open-pencil/scene-graph'

export const SHARED_STYLE_CATALOG_KINDS = ['fill', 'text', 'effect', 'grid'] as const satisfies ReadonlyArray<
  SharedStyleKind
>

export type SharedStyleCatalogKind = (typeof SHARED_STYLE_CATALOG_KINDS)[number]

const STYLE_VISUAL_KEYS = new Set<keyof SceneNode>([
  'fills',
  'effects',
  'layoutGrids',
  'fontFamily',
  'fontWeight',
  'italic',
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'textDecoration',
  'textCase',
  'fontFeatures'
])

const DEFAULT_STYLE_EFFECT: Effect = {
  type: 'DROP_SHADOW',
  color: { r: 0, g: 0, b: 0, a: 0.25 },
  offset: { x: 0, y: 4 },
  radius: 8,
  spread: 0,
  visible: true
}

function strokePaintsFromStyle(target: SceneNode, style: SceneNode): SceneNode['strokes'] {
  const fills = style.fills.filter((fill) => fill.type === 'SOLID')
  if (fills.length === 0) return target.strokes
  const fallback = target.strokes[0] ?? {
    color: BLACK,
    weight: 1,
    opacity: 1,
    visible: true,
    align: 'CENTER' as const
  }
  return fills.map((fill, index) => {
    const current = target.strokes[index] ?? fallback
    return {
      ...current,
      color: { ...fill.color },
      opacity: fill.opacity,
      visible: fill.visible
    }
  })
}

function fillsFromStrokes(node: SceneNode): SceneNode['fills'] {
  return node.strokes.map((stroke) => ({
    type: 'SOLID' as const,
    color: { ...stroke.color },
    opacity: stroke.opacity,
    visible: stroke.visible
  }))
}

export function sharedStylePatch(
  kind: SharedStyleKind,
  target: SceneNode,
  styleId: string,
  style: SceneNode | null
): Partial<SceneNode> {
  const refKey = sharedStyleRefKey(kind)
  const patch: Partial<SceneNode> = { [refKey]: styleId }
  if (!style) return patch

  if (kind === 'fill') patch.fills = copyFills(style.fills)
  else if (kind === 'stroke') patch.strokes = strokePaintsFromStyle(target, style)
  else if (kind === 'effect') patch.effects = copyEffects(style.effects)
  else if (kind === 'grid') patch.layoutGrids = copyLayoutGrids(style.layoutGrids)
  else {
    Object.assign(patch, {
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
      italic: style.italic,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      textDecoration: style.textDecoration,
      textCase: style.textCase,
      fontFeatures: style.fontFeatures.map((feature) => ({ ...feature }))
    })
  }
  return patch
}

export function sharedStyleDetachPatch(kind: SharedStyleKind): Partial<SceneNode> {
  return { [sharedStyleRefKey(kind)]: null }
}

export function uniqueStyleName(names: string[], base: string): string {
  if (!names.includes(base)) return base
  let index = 2
  while (names.includes(`${base} ${index}`)) index += 1
  return `${base} ${index}`
}

export function canCreateSharedStyle(node: SceneNode, kind: SharedStyleKind): boolean {
  if (kind === 'fill') return node.fills.length > 0
  if (kind === 'stroke') return node.strokes.length > 0
  if (kind === 'effect') return node.effects.length > 0
  if (kind === 'grid') return node.layoutGrids.length > 0
  return node.type === 'TEXT'
}

export function catalogKindForType(type: SharedStyleType): SharedStyleCatalogKind {
  if (type === 'TEXT') return 'text'
  if (type === 'EFFECT') return 'effect'
  if (type === 'GRID') return 'grid'
  return 'fill'
}

export function styleGroupMessageKey(
  kind: SharedStyleCatalogKind
): 'styleGroupColor' | 'styleGroupText' | 'styleGroupEffect' | 'styleGroupGrid' {
  if (kind === 'fill') return 'styleGroupColor'
  if (kind === 'text') return 'styleGroupText'
  if (kind === 'effect') return 'styleGroupEffect'
  return 'styleGroupGrid'
}

export function sharedStyleHasVisualChanges(changes: Partial<SceneNode>): boolean {
  return (Object.keys(changes) as Array<keyof SceneNode>).some((key) => STYLE_VISUAL_KEYS.has(key))
}

export function sharedStyleLeafName(name: string): string {
  const slash = name.lastIndexOf('/')
  if (slash <= 0) return name
  const leaf = name.slice(slash + 1).trim()
  return leaf || name
}

export function groupSharedStyles(styles: SharedStyle[]): Array<{ folder: string | null; styles: SharedStyle[] }> {
  const groups = new Map<string, SharedStyle[]>()
  const order: string[] = []
  for (const style of styles) {
    const slash = style.name.indexOf('/')
    const folder = slash > 0 ? style.name.slice(0, slash).trim() : ''
    const existing = groups.get(folder)
    if (existing) {
      existing.push(style)
      continue
    }
    groups.set(folder, [style])
    order.push(folder)
  }
  return order.map((folder) => ({
    folder: folder || null,
    styles: groups.get(folder) ?? []
  }))
}

export function sharedStylePreview(node: SceneNode): string {
  if (node.sharedStyleType === 'TEXT') {
    const weight = FONT_WEIGHT_NAMES[node.fontWeight] ?? String(node.fontWeight)
    return `${node.fontFamily} ${weight} ${node.fontSize}`
  }
  if (node.sharedStyleType === 'GRID') {
    const grid = node.layoutGrids[0]
    if (!grid) return ''
    const count = grid.count ?? grid.numSections ?? 0
    if (grid.pattern === 'ROWS') return `${count} rows`
    if (grid.pattern === 'GRID') return 'Square grid'
    return `${count} columns`
  }
  if (node.sharedStyleType === 'EFFECT') {
    return node.effects
      .map((effect) => effect.type.replaceAll('_', ' ').toLowerCase())
      .join(', ')
  }
  const fill = node.fills.find((item) => item.type === 'SOLID')
  return fill && fill.type === 'SOLID' ? colorToHex(fill.color) : ''
}

export function sharedStyleSwatch(node: SceneNode): string | null {
  const fill = node.fills.find((item) => item.type === 'SOLID')
  if (!fill || fill.type !== 'SOLID') return null
  return colorToHex(fill.color)
}

function styleDefinitionBase(kind: SharedStyleKind, name: string): Partial<SceneNode> {
  return {
    name,
    sharedStyleType: sharedStyleTypeForKind(kind),
    internalOnly: true,
    visible: false,
    x: 0,
    y: 0,
    width: 1,
    height: 1
  }
}

export function sharedStyleDefaultCreateProps(
  kind: SharedStyleKind,
  name: string
): { type: NodeType; props: Partial<SceneNode> } {
  const base = styleDefinitionBase(kind, name)
  if (kind === 'fill' || kind === 'stroke') {
    return { type: 'RECTANGLE', props: { ...base, fills: copyFills([DEFAULT_SHAPE_FILL]) } }
  }
  if (kind === 'effect') {
    return { type: 'RECTANGLE', props: { ...base, effects: copyEffects([DEFAULT_STYLE_EFFECT]) } }
  }
  if (kind === 'grid') {
    return {
      type: 'FRAME',
      props: {
        ...base,
        layoutGrids: copyLayoutGrids([{ pattern: 'COLUMNS', count: 12, gutterSize: 16, visible: true }])
      }
    }
  }
  return {
    type: 'TEXT',
    props: {
      ...base,
      fontFamily: DEFAULT_FONT_FAMILY,
      fontWeight: 400,
      italic: false,
      fontSize: 16,
      lineHeight: null,
      letterSpacing: 0,
      textDecoration: 'NONE',
      textCase: 'ORIGINAL',
      fontFeatures: []
    }
  }
}

export function sharedStyleCreateProps(
  kind: SharedStyleKind,
  source: SceneNode,
  name: string
): { type: NodeType; props: Partial<SceneNode> } {
  const base = styleDefinitionBase(kind, name)
  if (kind === 'fill') {
    return { type: 'RECTANGLE', props: { ...base, fills: copyFills(source.fills) } }
  }
  if (kind === 'stroke') {
    return { type: 'RECTANGLE', props: { ...base, fills: fillsFromStrokes(source) } }
  }
  if (kind === 'effect') {
    return { type: 'RECTANGLE', props: { ...base, effects: copyEffects(source.effects) } }
  }
  if (kind === 'grid') {
    return { type: 'FRAME', props: { ...base, layoutGrids: copyLayoutGrids(source.layoutGrids) } }
  }
  return {
    type: 'TEXT',
    props: {
      ...base,
      fontFamily: source.fontFamily,
      fontWeight: source.fontWeight,
      italic: source.italic,
      fontSize: source.fontSize,
      lineHeight: source.lineHeight,
      letterSpacing: source.letterSpacing,
      textDecoration: source.textDecoration,
      textCase: source.textCase,
      fontFeatures: source.fontFeatures.map((feature) => ({ ...feature }))
    }
  }
}
