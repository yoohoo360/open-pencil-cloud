import type { Theme as TwirlTheme } from 'twirlwind'
import { parse, formatHex } from 'culori'

/** Nested theme.extend-style maps from a classic Tailwind `module.exports` config. */
export interface TailwindThemeExtend {
  colors?: unknown
  spacing?: unknown
  margin?: unknown
  padding?: unknown
  fontSize?: unknown
  lineHeight?: unknown
  borderRadius?: unknown
}

/** Classic Tailwind config shape (or just its `theme` / `theme.extend` fragment). */
export interface TailwindConfigLike {
  theme?: {
    extend?: TailwindThemeExtend
    colors?: unknown
    spacing?: unknown
    margin?: unknown
    padding?: unknown
    fontSize?: unknown
    lineHeight?: unknown
    borderRadius?: unknown
  }
  extend?: TailwindThemeExtend
  colors?: unknown
  spacing?: unknown
  margin?: unknown
  padding?: unknown
  fontSize?: unknown
  lineHeight?: unknown
  borderRadius?: unknown
}

/** Flattened token maps used when matching design styles to utility classes. */
export interface TailwindThemeMaps {
  colors: Record<string, string>
  spacing: Record<string, string>
  margin: Record<string, string>
  padding: Record<string, string>
  fontSize: Record<string, string>
  lineHeight: Record<string, string>
  borderRadius: Record<string, string>
}

export type TailwindClassOptions = {
  /**
   * Pre-flattened maps. Highest priority — overlays merged configs.
   * Built-in twirl/Tailwind defaults are always last.
   */
  theme?: Partial<TailwindThemeMaps> | TwirlTheme
  /**
   * One or more classic Tailwind configs (`module.exports` objects).
   * Array order is priority: index 0 wins over later entries; defaults are last.
   * Ignored when `configs` is set.
   */
  config?: TailwindConfigLike | readonly TailwindConfigLike[] | null
  /**
   * Ordered configs (high → low priority). Preferred over `config` when both are set.
   */
  configs?: readonly TailwindConfigLike[] | null
  /**
   * Font treated as document default — omitted from Tailwind/JSX output when matched.
   * Falls back to OpenPencil's built-in default (Inter).
   */
  defaultFontFamily?: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function emptyThemeMaps(): TailwindThemeMaps {
  return {
    colors: {},
    spacing: {},
    margin: {},
    padding: {},
    fontSize: {},
    lineHeight: {},
    borderRadius: {}
  }
}

/** Merge token maps; earlier configs win on duplicate keys and on the same color value. */
export function mergeTailwindThemeMaps(mapsList: readonly TailwindThemeMaps[]): TailwindThemeMaps {
  const merged = emptyThemeMaps()
  const claimedColorValues = new Set<string>()
  for (const maps of mapsList) {
    for (const key of Object.keys(merged) as (keyof TailwindThemeMaps)[]) {
      if (key === 'colors') {
        for (const [token, value] of Object.entries(maps.colors)) {
          if (token in merged.colors) continue
          const colorKey = normalizeColorKey(value)
          if (colorKey && claimedColorValues.has(colorKey)) continue
          merged.colors[token] = value
          if (colorKey) claimedColorValues.add(colorKey)
        }
        continue
      }
      for (const [token, value] of Object.entries(maps[key])) {
        if (!(token in merged[key])) merged[key][token] = value
      }
    }
  }
  return merged
}

function normalizeConfigList(options?: TailwindClassOptions | null): TailwindConfigLike[] {
  if (options?.configs) {
    return options.configs.filter((item): item is TailwindConfigLike => Boolean(item))
  }
  const single = options?.config
  if (Array.isArray(single)) {
    return single.filter((item): item is TailwindConfigLike => Boolean(item))
  }
  return single ? [single] : []
}

function isColorString(value: string): boolean {
  const trimmed = value.trim().toLowerCase()
  return (
    trimmed.startsWith('#') ||
    trimmed.startsWith('rgb(') ||
    trimmed.startsWith('rgba(') ||
    trimmed.startsWith('hsl(') ||
    trimmed.startsWith('hsla(') ||
    trimmed.startsWith('oklch(') ||
    trimmed.startsWith('color(') ||
    trimmed === 'transparent' ||
    trimmed === 'currentcolor'
  )
}

function flattenStringLeaves(
  value: unknown,
  prefix = '',
  accept: (leaf: string) => boolean = () => true
): Record<string, string> {
  const out: Record<string, string> = {}
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed && accept(trimmed) && prefix) out[prefix] = trimmed
    return out
  }
  if (Array.isArray(value)) {
    const first = value[0]
    if (typeof first === 'string') {
      const trimmed = first.trim()
      if (trimmed && accept(trimmed) && prefix) out[prefix] = trimmed
    }
    return out
  }
  if (!isRecord(value)) return out
  for (const [key, child] of Object.entries(value)) {
    if (!key) continue
    const next = prefix ? `${prefix}-${key}` : key
    Object.assign(out, flattenStringLeaves(child, next, accept))
  }
  return out
}

function flattenTokenMap(value: unknown): Record<string, string> {
  return flattenStringLeaves(value, '', () => true)
}

function flattenColorMap(value: unknown): Record<string, string> {
  return flattenStringLeaves(value, '', isColorString)
}

function readExtend(config: TailwindConfigLike | null | undefined): TailwindThemeExtend {
  if (!config) return {}
  if (isRecord(config.theme)) {
    const theme = config.theme
    if (isRecord(theme.extend)) {
      return {
        colors: theme.extend.colors ?? theme.colors,
        spacing: theme.extend.spacing ?? theme.spacing,
        margin: theme.extend.margin ?? theme.margin,
        padding: theme.extend.padding ?? theme.padding,
        fontSize: theme.extend.fontSize ?? theme.fontSize,
        lineHeight: theme.extend.lineHeight ?? theme.lineHeight,
        borderRadius: theme.extend.borderRadius ?? theme.borderRadius
      }
    }
    return {
      colors: theme.colors,
      spacing: theme.spacing,
      margin: theme.margin,
      padding: theme.padding,
      fontSize: theme.fontSize,
      lineHeight: theme.lineHeight,
      borderRadius: theme.borderRadius
    }
  }
  if (isRecord(config.extend)) return config.extend
  return {
    colors: config.colors,
    spacing: config.spacing,
    margin: config.margin,
    padding: config.padding,
    fontSize: config.fontSize,
    lineHeight: config.lineHeight,
    borderRadius: config.borderRadius
  }
}

/** Flatten a classic Tailwind config into token maps for class matching. */
export function flattenTailwindConfig(config: TailwindConfigLike | null | undefined): TailwindThemeMaps {
  const extend = readExtend(config)
  return {
    // Top-to-bottom within this file: first token that claims a color value wins.
    colors: dedupeColorsFirstWins(flattenColorMap(extend.colors)),
    spacing: flattenTokenMap(extend.spacing),
    margin: flattenTokenMap(extend.margin),
    padding: flattenTokenMap(extend.padding),
    fontSize: flattenTokenMap(extend.fontSize),
    lineHeight: flattenTokenMap(extend.lineHeight),
    borderRadius: flattenTokenMap(extend.borderRadius)
  }
}

/**
 * Resolve theme maps for codegen.
 * Priority: `theme` overlay → configs in order → twirl/Tailwind defaults (at emit time).
 */
export function resolveTailwindThemeMaps(options?: TailwindClassOptions | null): TailwindThemeMaps {
  const fromConfigs = mergeTailwindThemeMaps(
    normalizeConfigList(options).map((config) => flattenTailwindConfig(config))
  )
  const theme = options?.theme
  if (!theme) return fromConfigs

  const overlay: TailwindThemeMaps = {
    colors: { ...(theme.colors ?? {}) },
    spacing: { ...('spacing' in theme ? (theme.spacing ?? {}) : {}) },
    margin: {
      ...('margin' in theme ? ((theme as Partial<TailwindThemeMaps>).margin ?? {}) : {})
    },
    padding: {
      ...('padding' in theme ? ((theme as Partial<TailwindThemeMaps>).padding ?? {}) : {})
    },
    fontSize: {
      ...('fontSize' in theme ? ((theme as Partial<TailwindThemeMaps>).fontSize ?? {}) : {})
    },
    lineHeight: {
      ...('lineHeight' in theme ? ((theme as Partial<TailwindThemeMaps>).lineHeight ?? {}) : {})
    },
    borderRadius: {
      ...('borderRadius' in theme
        ? ((theme as Partial<TailwindThemeMaps>).borderRadius ?? {})
        : {})
    }
  }
  return mergeTailwindThemeMaps([overlay, fromConfigs])
}

export function toTwirlTheme(maps: TailwindThemeMaps): TwirlTheme {
  return {
    colors: orderColorsForMatching(maps.colors),
    spacing: maps.spacing
  }
}

function parsePx(value: string): number | null {
  const trimmed = value.trim().toLowerCase()
  if (trimmed.endsWith('px')) {
    const n = Number(trimmed.slice(0, -2))
    return Number.isFinite(n) ? n : null
  }
  if (trimmed.endsWith('rem')) {
    const n = Number(trimmed.slice(0, -3))
    return Number.isFinite(n) ? n * 16 : null
  }
  return null
}

/** Normalize color strings to a comparable hex key when possible. */
function normalizeColorKey(value: string): string {
  const parsed = parse(value.trim())
  if (parsed) {
    const hex = formatHex(parsed)
    if (hex) return hex.toLowerCase()
  }
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

/** Build px → preferred token; first insertion wins (priority already ordered). */
function invertTokenMap(map: Record<string, string>): Map<number, string> {
  const byPx = new Map<number, string>()
  for (const [token, raw] of Object.entries(map)) {
    const px = parsePx(raw)
    if (px === null) continue
    if (!byPx.has(px)) byPx.set(px, token)
  }
  return byPx
}

/**
 * One token per color value, in object insertion order (config top → bottom).
 * Later aliases for an already-claimed hex are dropped.
 */
export function dedupeColorsFirstWins(colors: Record<string, string>): Record<string, string> {
  const claimed = new Set<string>()
  const out: Record<string, string> = {}
  for (const [token, raw] of Object.entries(colors)) {
    const key = normalizeColorKey(raw)
    if (!key || claimed.has(key)) continue
    claimed.add(key)
    out[token] = raw
  }
  return out
}

/** Build normalized-color → token (map should already be value-deduped, first-wins). */
function invertColorMap(map: Record<string, string>): Map<string, string> {
  const byColor = new Map<string, string>()
  for (const [token, raw] of Object.entries(map)) {
    const key = normalizeColorKey(raw)
    if (!key || byColor.has(key)) continue
    byColor.set(key, token)
  }
  return byColor
}

/** Keep insertion order for twirl first-match (already priority-ordered). */
export function orderColorsForMatching(colors: Record<string, string>): Record<string, string> {
  return { ...colors }
}

const SPACING_PREFIXES = [
  'w',
  'h',
  'size',
  'min-w',
  'min-h',
  'max-w',
  'max-h',
  'gap',
  'gap-x',
  'gap-y',
  'space-x',
  'space-y',
  'inset',
  'inset-x',
  'inset-y',
  'top',
  'right',
  'bottom',
  'left',
  'translate-x',
  'translate-y'
] as const

const PADDING_PREFIXES = ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe'] as const
const MARGIN_PREFIXES = [
  'm',
  'mx',
  'my',
  'mt',
  'mr',
  'mb',
  'ml',
  'ms',
  'me',
  '-m',
  '-mx',
  '-my',
  '-mt',
  '-mr',
  '-mb',
  '-ml',
  '-ms',
  '-me'
] as const

const COLOR_STYLE_TO_PREFIX: Array<{ property: string; prefix: string }> = [
  { property: 'backgroundColor', prefix: 'bg' },
  { property: 'color', prefix: 'text' },
  { property: 'borderColor', prefix: 'border' },
  { property: 'outlineColor', prefix: 'outline' },
  { property: 'fill', prefix: 'fill' },
  { property: 'stroke', prefix: 'stroke' }
]

function defaultScalePx(token: string): number | null {
  if (token === 'px') return 1
  if (token === '0') return 0
  const n = Number(token)
  if (!Number.isFinite(n)) return null
  return n * 4
}

function lookupToken(px: number, prefix: string, maps: TailwindThemeMaps): string | undefined {
  const padding = invertTokenMap(maps.padding)
  const margin = invertTokenMap(maps.margin)
  const spacing = invertTokenMap(maps.spacing)

  const isPadding = (PADDING_PREFIXES as readonly string[]).includes(prefix)
  const isMargin =
    (MARGIN_PREFIXES as readonly string[]).includes(prefix) || prefix.startsWith('-m')

  if (isPadding) return padding.get(px) ?? spacing.get(px)
  if (isMargin) return margin.get(px) ?? spacing.get(px)
  return spacing.get(px) ?? padding.get(px) ?? margin.get(px)
}

function remapSpacingClass(className: string, maps: TailwindThemeMaps): string {
  const negative = className.startsWith('-')
  const raw = negative ? className.slice(1) : className
  const match = /^(.*?)-(.+)$/.exec(raw)
  if (!match) return className
  const [, prefix, token] = match
  const known =
    (SPACING_PREFIXES as readonly string[]).includes(prefix) ||
    (PADDING_PREFIXES as readonly string[]).includes(prefix) ||
    (MARGIN_PREFIXES as readonly string[]).includes(prefix) ||
    prefix.startsWith('-m')
  if (!known) return className

  let px: number | null = null
  const arbitrary = /^\[(.+)\]$/.exec(token)
  if (arbitrary) px = parsePx(arbitrary[1])
  else px = defaultScalePx(token)
  if (px === null) return className

  const named = lookupToken(px, prefix, maps)
  if (!named || named === token) return className
  return `${negative ? '-' : ''}${prefix}-${named}`
}

function remapFontSizeClass(className: string, maps: TailwindThemeMaps): string {
  if (Object.keys(maps.fontSize).length === 0) return className
  const match = /^text-(.+)$/.exec(className)
  if (!match) return className
  const token = match[1]
  const arbitrary = /^\[(.+)\]$/.exec(token)
  let px: number | null = null
  if (arbitrary) px = parsePx(arbitrary[1])
  else if (maps.fontSize[token]) return className
  if (px === null) return className
  const named = invertTokenMap(maps.fontSize).get(px)
  if (!named) return className
  return `text-${named}`
}

function remapRoundedClass(className: string, maps: TailwindThemeMaps): string {
  if (Object.keys(maps.borderRadius).length === 0) return className
  const match = /^rounded(?:-(.+))?$/.exec(className)
  if (!match) return className
  const token = match[1]
  let px: number | null = null
  if (!token) px = 4
  else if (token === 'sm') px = 2
  else if (token === 'md') px = 6
  else if (token === 'lg') px = 8
  else if (token === 'xl') px = 12
  else if (token === '2xl') px = 16
  else if (token === '3xl') px = 24
  else if (token === 'full') return className
  else if (token === 'none') px = 0
  else {
    const arbitrary = /^\[(.+)\]$/.exec(token)
    if (arbitrary) px = parsePx(arbitrary[1])
  }
  if (px === null) return className
  const named = invertTokenMap(maps.borderRadius).get(px)
  if (!named) return className
  return named === 'DEFAULT' || named === 'border-radius' ? 'rounded' : `rounded-${named}`
}

/**
 * Prefer project color tokens over twirl defaults (defaults are searched first by twirl).
 * Uses original style values so custom configs win even when the hex also exists in defaults.
 */
function preferThemeColorClasses(
  classes: string[],
  maps: TailwindThemeMaps,
  style: Record<string, string> | undefined
): string[] {
  if (!style || Object.keys(maps.colors).length === 0) return classes
  const byColor = invertColorMap(maps.colors)
  let next = [...classes]
  for (const { property, prefix } of COLOR_STYLE_TO_PREFIX) {
    const raw = style[property]
    if (!raw) continue
    const token = byColor.get(normalizeColorKey(raw))
    if (!token) continue
    const preferred = `${prefix}-${token}`
    const filtered = next.filter((className) => !className.startsWith(`${prefix}-`))
    next = [...filtered, preferred]
  }
  return next
}

/**
 * Prefer project theme token names over default Tailwind numeric / named classes.
 * Config order is already baked into `maps` (earlier = higher priority).
 */
export function remapClassesToTheme(
  classes: string[],
  maps: TailwindThemeMaps,
  style?: Record<string, string>
): string[] {
  const hasSpacing =
    Object.keys(maps.spacing).length > 0 ||
    Object.keys(maps.padding).length > 0 ||
    Object.keys(maps.margin).length > 0
  const hasType = Object.keys(maps.fontSize).length > 0
  const hasRadius = Object.keys(maps.borderRadius).length > 0
  const hasColors = Object.keys(maps.colors).length > 0
  if (!hasSpacing && !hasType && !hasRadius && !hasColors) return classes

  let next = preferThemeColorClasses(classes, maps, style)
  return next.map((className) => {
    let remapped = className
    if (hasSpacing) remapped = remapSpacingClass(remapped, maps)
    if (hasType) remapped = remapFontSizeClass(remapped, maps)
    if (hasRadius) remapped = remapRoundedClass(remapped, maps)
    return remapped
  })
}
