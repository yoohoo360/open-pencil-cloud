import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import type { Plugin } from 'vite'

const SOURCE_EXT = /\.(tsx?|jsx?)$/

export function overridePathFor(filePath: string): string | null {
  if (filePath.includes('.override.')) return null
  const match = /^(.*)\.(tsx?|jsx?)$/.exec(filePath)
  if (!match) return null
  return `${match[1]}.override.${match[2]}`
}

export function resolvedOverridePath(filePath: string): string | null {
  const overridePath = overridePathFor(filePath)
  if (!overridePath || !existsSync(overridePath)) return null
  return overridePath
}

export function collectOverrideAliases(searchDirs: string[]): Record<string, string> {
  const aliases: Record<string, string> = {}
  for (const dir of searchDirs) walkOverrides(dir, aliases)
  return aliases
}

function walkOverrides(dir: string, aliases: Record<string, string>): void {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue
      walkOverrides(full, aliases)
      continue
    }
    if (!SOURCE_EXT.test(entry) || entry.includes('.override.')) continue
    const overridePath = resolvedOverridePath(full)
    if (overridePath) aliases[full] = overridePath
  }
}

/** Vite: `foo.ts` resolves to `foo.override.ts` when that file exists. */
export function overrideAliasPlugin(): Plugin {
  return {
    name: 'open-pencil-override-alias',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (source.includes('\0') || source.includes('node_modules')) return null
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      if (!resolved || resolved.external || resolved.id.includes('node_modules')) return null
      return resolvedOverridePath(resolved.id)
    }
  }
}

/**
 * Webpack `resolve.alias` map of absolute `foo.ts` → `foo.override.ts`.
 * Use with `resolve.alias: { ...collectOverrideAliases([coreSrc]) }`.
 */
export function webpackOverrideAliases(searchDirs: string[]): Record<string, string> {
  return collectOverrideAliases(searchDirs)
}
