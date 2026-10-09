/** Structured pieces of a Dev-mode codegen assistant reply. */
export type CodegenArtifacts = {
  thinking: string
  plan: string
  steps: string
  code: string
}

export type SkillRef = {
  key: string
  name: string
}

export const emptyCodegenArtifacts = (): CodegenArtifacts => ({
  thinking: '',
  plan: '',
  steps: '',
  code: ''
})

/** Strip accidental XML / fence wrappers from a code payload. */
export function sanitizeCodePayload(value: string): string {
  let text = value.trim()
  // Drop whole tagged sections if the model stuffed them into a fence.
  text = text.replace(
    /<(thinking|plan|steps|skills|code)>[\s\S]*?<\/\1>/gi,
    ''
  )
  text = text.replace(/<\/?(?:thinking|plan|steps|skills|code)>/gi, '')
  text = text.replace(/^```[\w-]*\s*\n?/, '').replace(/\n?```\s*$/, '')
  return text.trim()
}

/**
 * Only fenced blocks or `<code>…</code>`. Never the whole reply (avoids think/plan in the code box).
 */
export function extractGeneratedCode(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const tagged = extractTaggedSection(trimmed, 'code')
  if (tagged) return sanitizeCodePayload(tagged)
  const blocks = [...trimmed.matchAll(/```(?:[\w-]*)?\n([\s\S]*?)```/g)]
    .map((match) => sanitizeCodePayload(match[1] ?? ''))
    .filter(Boolean)
  if (blocks.length > 0) return blocks[blocks.length - 1] ?? ''
  return ''
}

/**
 * Read `<name>…</name>` content. While streaming, an unclosed tag yields everything
 * after the opener until the next known section tag or end of text.
 */
function extractTaggedSection(text: string, name: string): string {
  const open = `<${name}>`
  const start = text.toLowerCase().indexOf(open.toLowerCase())
  if (start < 0) return ''
  // Preserve original slice offsets using case-sensitive search of same length region
  const openActual = text.slice(start, start + open.length)
  const contentStart = start + openActual.length
  const close = `</${name}>`
  const end = text.toLowerCase().indexOf(close.toLowerCase(), contentStart)
  if (end >= 0) return text.slice(contentStart, end).trim()
  const rest = text.slice(contentStart)
  const nextTag = rest.search(/<(?:thinking|plan|steps|skills|code)(?:\s|>)/i)
  return (nextTag >= 0 ? rest.slice(0, nextTag) : rest).trim()
}

function stripTaggedSections(text: string): string {
  return text
    .replace(
      /<(thinking|plan|steps|skills|code)>[\s\S]*?(?:<\/\1>|(?=<(?:thinking|plan|steps|skills|code)(?:\s|>))|$)/gi,
      ''
    )
    .trim()
}

/**
 * Skill keys from `<skills>`, plus keys/names mentioned in the reply that match the catalog.
 */
export function extractSkillKeys(text: string, catalog: readonly SkillRef[]): string[] {
  if (catalog.length === 0) return []
  const byKey = new Map(catalog.map((skill) => [skill.key.toLowerCase(), skill.key]))
  const byName = new Map(
    catalog.map((skill) => [skill.name.trim().toLowerCase(), skill.key]).filter(([name]) => name)
  )
  const out: string[] = []
  const seen = new Set<string>()

  const add = (raw: string) => {
    const token = raw.trim().replace(/^[`"'[]+|[`"'\]]+$/g, '')
    if (!token) return
    const lower = token.toLowerCase()
    const key = byKey.get(lower) ?? byName.get(lower)
    if (!key || seen.has(key)) return
    seen.add(key)
    out.push(key)
  }

  const section = extractTaggedSection(text, 'skills')
  for (const token of section.split(/[\n,]+/)) add(token)

  // Also accept keys/names mentioned in steps/plan when the model skips <skills>.
  const scan = `${extractTaggedSection(text, 'steps')}\n${extractTaggedSection(text, 'plan')}\n${section}`
  for (const skill of catalog) {
    const keyPattern = new RegExp(`(?:^|[^\\w-])${escapeRegExp(skill.key)}(?:$|[^\\w-])`, 'i')
    if (keyPattern.test(scan)) add(skill.key)
    if (skill.name.trim().length >= 2) {
      const namePattern = new RegExp(`(?:^|[^\\w])${escapeRegExp(skill.name.trim())}(?:$|[^\\w])`, 'i')
      if (namePattern.test(scan)) add(skill.key)
    }
  }

  return out
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Last non-empty line for collapsed previews. */
export function lastNonEmptyLine(text: string): string {
  const lines = text
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  return lines[lines.length - 1] ?? ''
}

/** `<lookup>name or id</lookup>` requests from the planning reply. */
export function extractLookups(text: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const match of text.matchAll(/<lookup>([\s\S]*?)<\/lookup>/gi)) {
    for (const line of (match[1] ?? '').split(/[\n,]+/)) {
      const query = line.trim()
      if (!query || seen.has(query)) continue
      seen.add(query)
      out.push(query)
    }
  }
  return out
}

/**
 * Split an assistant reply into thinking, plan, steps, and code.
 * Code comes only from fences / `<code>`; never the whole reply.
 */
export function parseCodegenReply(text: string, reasoning = ''): CodegenArtifacts {
  const thinkingTagged = extractTaggedSection(text, 'thinking')
  const plan = extractTaggedSection(text, 'plan')
  const steps = extractTaggedSection(text, 'steps')
  const code = extractGeneratedCode(text)
  let thinking = thinkingTagged
  if (!thinking && !plan && !steps) {
    const leftover = stripTaggedSections(text)
      .replace(/```(?:[\w-]*)?\n[\s\S]*?```/g, '')
      .trim()
    thinking = leftover
  }
  const reasoningText = reasoning.trim()
  if (reasoningText) {
    thinking = thinking ? `${reasoningText}\n\n${thinking}` : reasoningText
  }
  return { thinking, plan, steps, code }
}
