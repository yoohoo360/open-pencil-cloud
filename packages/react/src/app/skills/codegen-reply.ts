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
    /<(think|thinking|plan|steps|skills|code)>[\s\S]*?<\/\1>/gi,
    ''
  )
  text = text.replace(/<\/?(?:think|thinking|plan|steps|skills|code)>/gi, '')
  text = text.replace(/^```[\w-]*\s*\n?/, '').replace(/\n?```\s*$/, '')
  return text.trim()
}

/**
 * Only fenced blocks or `<code>…</code>`. Never the whole reply (avoids think/plan in the code box).
 * While streaming, an unclosed fence / `<code>` tag still yields the partial body.
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
  // Incomplete fence during generate stream: ```tsx\npartial…
  const openFence = trimmed.match(/```(?:[\w-]*)?\r?\n([\s\S]*)$/)
  if (openFence?.[1] != null) return sanitizeCodePayload(openFence[1])
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
  const nextTag = rest.search(/<(?:think|thinking|plan|steps|skills|code)(?:\s|>)/i)
  return (nextTag >= 0 ? rest.slice(0, nextTag) : rest).trim()
}

function stripTaggedSections(text: string): string {
  return text
    .replace(
      /<(think|thinking|plan|steps|skills|code)>[\s\S]*?(?:<\/\1>|(?=<(?:think|thinking|plan|steps|skills|code)(?:\s|>))|$)/gi,
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

  // Also accept keys/names mentioned in think/plan/steps when the model skips <skills>.
  const scan = [
    extractTaggedSection(text, 'think'),
    extractTaggedSection(text, 'thinking'),
    extractTaggedSection(text, 'plan'),
    extractTaggedSection(text, 'steps'),
    section
  ].join('\n')
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
 * Merge provider reasoning / leftover prose into the plan body.
 * UI shows one plan section (no separate thinking), then steps/code execute.
 */
export function mergePlanBody(plan: string, ...extras: string[]): string {
  const parts = [...extras, plan].map((part) => part.trim()).filter(Boolean)
  return parts.join('\n\n')
}

/**
 * Split an assistant reply into plan, steps, and code.
 * Reasoning and legacy `<thinking>` fold into `plan`; `thinking` stays empty.
 * Code comes only from fences / `<code>`; never the whole reply.
 */
export function parseCodegenReply(text: string, reasoning = ''): CodegenArtifacts {
  const thinkingTagged = extractTaggedSection(text, 'thinking')
  let plan = extractTaggedSection(text, 'plan')
  const steps = extractTaggedSection(text, 'steps')
  const code = extractGeneratedCode(text)
  let preamble = thinkingTagged
  if (!preamble && !plan && !steps) {
    const leftover = stripTaggedSections(text)
      .replace(/```(?:[\w-]*)?\n[\s\S]*?```/g, '')
      .trim()
    preamble = leftover
  }
  plan = mergePlanBody(plan, reasoning, preamble)
  return { thinking: '', plan, steps, code }
}
