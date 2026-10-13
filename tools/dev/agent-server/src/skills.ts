import { createMiddleware } from 'langchain'

export type SkillPackagePayload = {
  key: string
  name: string
  body: string
}

function asSkillPackages(value: unknown): SkillPackagePayload[] {
  if (!Array.isArray(value)) return []
  const out: SkillPackagePayload[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const key = typeof record.key === 'string' ? record.key.trim() : ''
    const name = typeof record.name === 'string' ? record.name.trim() : key
    const body = typeof record.body === 'string' ? record.body : ''
    if (!key) continue
    out.push({ key, name: name || key, body })
  }
  return out
}

/** Build a system-prompt suffix from page chat skill picker payload. */
export function skillsPromptFromConfigurable(
  configurable: Record<string, unknown> | undefined
): string {
  if (!configurable) return ''
  const catalog =
    typeof configurable.skillsCatalog === 'string' ? configurable.skillsCatalog.trim() : ''
  const packages = asSkillPackages(configurable.skillPackages)
  if (!catalog && packages.length === 0) return ''

  const parts: string[] = ['## Enabled skills (from the page chat picker)']
  if (catalog) {
    parts.push('Catalog (prefer these keys when planning):', catalog)
  }
  if (packages.length > 0) {
    parts.push('Loaded skill packages — follow their guidance when relevant:')
    for (const pkg of packages) {
      parts.push(`### Skill ${pkg.name} (${pkg.key})\n${pkg.body.trim() || '(empty package)'}`)
    }
  } else {
    parts.push('No skill packages were loaded for this turn; use the catalog keys only.')
  }
  return parts.join('\n\n')
}

/** Append page-selected skills to the system prompt each model call. */
export const skillsContextMiddleware = createMiddleware({
  name: 'OpenPencilSkillsContext',
  wrapModelCall: async (request, handler) => {
    const block = skillsPromptFromConfigurable(
      request.runtime?.configurable as Record<string, unknown> | undefined
    )
    if (!block) return handler(request)

    const base =
      typeof request.systemPrompt === 'string'
        ? request.systemPrompt
        : typeof request.systemPrompt === 'object' &&
            request.systemPrompt &&
            'content' in request.systemPrompt &&
            typeof (request.systemPrompt as { content: unknown }).content === 'string'
          ? (request.systemPrompt as { content: string }).content
          : ''

    return handler({
      ...request,
      systemPrompt: base ? `${base}\n\n${block}` : block
    })
  }
})
