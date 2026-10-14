import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Load via bun-compatible TS path by reading the source constants inline.
const envSource = readFileSync(
  join(root, 'packages/react/src/app/skills/agent-environments.ts'),
  'utf8'
)
const block = envSource.match(
  /export const SKILL_AGENT_ENVIRONMENTS = (\[[\s\S]*?\]) as const/
)?.[1]
if (!block) throw new Error('Could not parse SKILL_AGENT_ENVIRONMENTS')
const environments = Function(`"use strict"; return (${block})`)()

const skillPaths = environments.flatMap((env) => [
  { path: `**/${env.label}` },
  { path: `**/${env.relativeSkillsDir}` },
  { path: `**/${env.relativeSkillsDir}/**` }
])

const path = join(root, 'desktop-react/capabilities/default.json')
const cap = JSON.parse(readFileSync(path, 'utf8'))
const perms = cap.permissions

function mergeAllow(existing = [], extra = []) {
  const out = []
  const seen = new Set()
  for (const item of [...existing, ...extra]) {
    if (!item?.path || seen.has(item.path)) continue
    seen.add(item.path)
    out.push({ path: item.path })
  }
  return out
}

function upsertAllow(identifier, extraPaths) {
  const idx = perms.findIndex(
    (p) => typeof p === 'object' && p && p.identifier === identifier
  )
  const allow = mergeAllow([{ path: '**' }, ...extraPaths], [])
  if (idx >= 0) {
    const prev = perms[idx]
    perms[idx] = {
      ...prev,
      allow: mergeAllow(prev.allow ?? [], allow)
    }
    return
  }
  const entry = { identifier, allow }
  const readIdx = perms.findIndex((p) => p === 'fs:allow-read')
  if (readIdx >= 0) perms.splice(readIdx + 1, 0, entry)
  else perms.push(entry)
}

upsertAllow('fs:allow-read-dir', skillPaths)
upsertAllow('fs:allow-exists', skillPaths)
upsertAllow('fs:allow-read-file', skillPaths)
upsertAllow('fs:allow-read-text-file', skillPaths)
upsertAllow('fs:allow-write-file', skillPaths)
upsertAllow('fs:allow-mkdir', skillPaths)
upsertAllow('fs:allow-remove', skillPaths)
upsertAllow('fs:allow-stat', skillPaths)
upsertAllow('fs:allow-open', skillPaths)

writeFileSync(path, `${JSON.stringify(cap, null, 2)}\n`)
console.log(`updated ${path} (+${skillPaths.length} skill paths)`)
