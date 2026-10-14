import { unzipSync } from 'fflate'

import { skillAPI, type SkillEntry } from '#react/lib/client'

function flattenFiles(nodes: SkillEntry[]): SkillEntry[] {
  const out: SkillEntry[] = []
  for (const node of nodes) {
    if (node.kind === 'file') out.push(node)
    if (node.children?.length) out.push(...flattenFiles(node.children))
  }
  return out
}

function hasSkillMd(entries: Record<string, Uint8Array>): boolean {
  return Boolean(entries['SKILL.md'] || entries['skill.md'])
}

/** Strip a single shared root folder / nested path so `SKILL.md` sits at the package root. */
export function normalizeSkillPackageEntries(
  entries: Record<string, Uint8Array>
): Record<string, Uint8Array> {
  const normalized: Record<string, Uint8Array> = {}
  for (const [rawName, data] of Object.entries(entries)) {
    if (!rawName || rawName.endsWith('/')) continue
    const name = rawName.replace(/\\/g, '/').replace(/^\.\//, '')
    if (!name || name.includes('..')) continue
    normalized[name] = data
  }
  if (hasSkillMd(normalized)) return normalized

  const keys = Object.keys(normalized)
  const skillMdPath = keys.find(
    (path) =>
      path === 'SKILL.md' ||
      path === 'skill.md' ||
      path.endsWith('/SKILL.md') ||
      path.endsWith('/skill.md')
  )
  if (skillMdPath?.includes('/')) {
    const dir = skillMdPath.slice(0, skillMdPath.lastIndexOf('/') + 1)
    const stripped: Record<string, Uint8Array> = {}
    for (const [name, data] of Object.entries(normalized)) {
      if (!name.startsWith(dir)) continue
      const next = name.slice(dir.length)
      if (next) stripped[next] = data
    }
    if (hasSkillMd(stripped)) return stripped
  }

  const tops = new Set(keys.map((path) => path.split('/')[0]).filter(Boolean))
  if (tops.size === 1) {
    const root = [...tops][0]!
    const stripped: Record<string, Uint8Array> = {}
    for (const [name, data] of Object.entries(normalized)) {
      if (!name.startsWith(`${root}/`)) continue
      stripped[name.slice(root.length + 1)] = data
    }
    if (hasSkillMd(stripped)) return stripped
  }

  return normalized
}

async function entriesFromTree(platformId: string): Promise<Record<string, Uint8Array> | null> {
  const response = await skillAPI.tree(platformId)
  const files = flattenFiles(response.data ?? [])
  if (files.length === 0) return null
  const encoder = new TextEncoder()
  const entries: Record<string, Uint8Array> = {}
  for (const file of files) {
    const path = file.path.replace(/\\/g, '/').replace(/^\.\//, '')
    if (!path || path.includes('..')) continue
    entries[path] = encoder.encode(file.content ?? '')
  }
  const normalized = normalizeSkillPackageEntries(entries)
  return hasSkillMd(normalized) ? normalized : null
}

async function entriesFromDownload(platformId: string): Promise<Record<string, Uint8Array> | null> {
  const response = await skillAPI.download(platformId)
  const blob = response.data
  if (!(blob instanceof Blob) || blob.size === 0) return null
  const bytes = new Uint8Array(await blob.arrayBuffer())
  // API errors are sometimes returned as JSON with responseType: 'blob'.
  if (bytes[0] === 0x7b /* { */) {
    try {
      const body = JSON.parse(new TextDecoder().decode(bytes)) as {
        error?: string
        message?: string
      }
      if (body.error || body.message) {
        throw new Error(body.error || body.message || 'Skill download failed')
      }
    } catch (error) {
      if (error instanceof Error && /download failed|error/i.test(error.message)) throw error
    }
  }
  try {
    const entries = normalizeSkillPackageEntries(unzipSync(bytes))
    return hasSkillMd(entries) ? entries : null
  } catch {
    return null
  }
}

async function entriesFromSkillContent(platformId: string): Promise<Record<string, Uint8Array> | null> {
  const response = await skillAPI.get(platformId)
  const content = response.data?.content?.trim() ?? ''
  if (!content) return null
  return { 'SKILL.md': new TextEncoder().encode(content) }
}

/**
 * Pull a platform skill package for local install.
 * Prefers package tree files, then download zip, then skill content field.
 */
export async function loadPlatformSkillEntries(
  platformId: string
): Promise<Record<string, Uint8Array>> {
  const fromTree = await entriesFromTree(platformId).catch(() => null)
  if (fromTree) return fromTree

  const fromDownload = await entriesFromDownload(platformId).catch((error) => {
    if (error instanceof Error && /download failed/i.test(error.message)) throw error
    return null
  })
  if (fromDownload) return fromDownload

  const fromContent = await entriesFromSkillContent(platformId).catch(() => null)
  if (fromContent) return fromContent

  throw new Error('Remote skill has no SKILL.md (tree, zip, or content)')
}
