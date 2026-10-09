export type SkillFrontmatter = {
  name: string
  description: string
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

/** Parse YAML-ish `name` / `description` from SKILL.md frontmatter (supports `|` / `>` blocks). */
export function parseSkillFrontmatter(markdown: string): SkillFrontmatter {
  const match = FRONTMATTER_RE.exec(markdown)
  if (!match) return { name: '', description: '' }
  const block = match[1] ?? ''
  return {
    name: readYamlValue(block, 'name'),
    description: readYamlValue(block, 'description')
  }
}

/** Upsert `name` / `description` in SKILL.md frontmatter; creates a block if missing. */
export function upsertSkillFrontmatter(
  markdown: string,
  fields: Partial<SkillFrontmatter>
): string {
  const name = fields.name
  const description = fields.description
  const match = FRONTMATTER_RE.exec(markdown)
  if (!match) {
    const lines = ['---']
    if (name !== undefined) lines.push(formatYamlField('name', name))
    if (description !== undefined) lines.push(formatYamlField('description', description))
    lines.push('---', '')
    return `${lines.join('\n')}${markdown.replace(/^\uFEFF/, '')}`
  }
  let block = match[1] ?? ''
  if (name !== undefined) block = setYamlField(block, 'name', name)
  if (description !== undefined) block = setYamlField(block, 'description', description)
  const body = markdown.slice(match[0].length)
  return `---\n${block.trimEnd()}\n---\n${body}`
}

function readYamlValue(block: string, key: string): string {
  const lines = block.split(/\r?\n/)
  const keyRe = new RegExp(`^${key}:\\s*(.*)$`, 'i')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const match = keyRe.exec(line)
    if (!match) continue
    const rest = (match[1] ?? '').trim()
    if (rest === '|' || rest === '>' || rest === '|-' || rest === '|+' || rest === '>-' || rest === '>+') {
      const folded = rest.startsWith('>')
      return readBlockScalar(lines, i + 1, folded)
    }
    if (!rest) {
      // `description:` with value on following indented lines (implicit block)
      const next = lines[i + 1] ?? ''
      if (/^\s+\S/.test(next)) return readBlockScalar(lines, i + 1, false)
      return ''
    }
    return unquote(rest)
  }
  return ''
}

function readBlockScalar(lines: string[], start: number, folded: boolean): string {
  const collected: string[] = []
  let indent: number | null = null
  for (let i = start; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (line.trim() === '' && indent === null) {
      collected.push('')
      continue
    }
    const leading = line.match(/^(\s*)/)?.[1]?.length ?? 0
    if (indent === null) {
      if (leading === 0) break
      indent = leading
    } else if (line.trim() !== '' && leading < indent) {
      break
    }
    const content = indent !== null && leading >= indent ? line.slice(indent) : line.trimStart()
    collected.push(content)
  }
  // Drop trailing empty lines (YAML `|` default chomping strip-ish for UI)
  while (collected.length > 0 && collected[collected.length - 1] === '') collected.pop()
  if (folded) {
    return collected
      .map((line) => line.trimEnd())
      .join(' ')
      .replace(/ +/g, ' ')
      .trim()
  }
  return collected.join('\n')
}

function setYamlField(block: string, key: string, value: string): string {
  const lines = block.split(/\r?\n/)
  const keyRe = new RegExp(`^${key}:\\s*(.*)$`, 'i')
  let start = -1
  let end = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const match = keyRe.exec(line)
    if (!match) continue
    start = i
    const rest = (match[1] ?? '').trim()
    if (
      rest === '|' ||
      rest === '>' ||
      rest === '|-' ||
      rest === '|+' ||
      rest === '>-' ||
      rest === '>+' ||
      rest === ''
    ) {
      end = i + 1
      while (end < lines.length) {
        const next = lines[end] ?? ''
        if (next.trim() === '') {
          end += 1
          continue
        }
        if (/^\s+\S/.test(next)) {
          end += 1
          continue
        }
        break
      }
    } else {
      end = i + 1
    }
    break
  }
  const fieldLines = formatYamlField(key, value).split('\n')
  if (start < 0) {
    const trimmed = block.trimEnd()
    return trimmed ? `${trimmed}\n${fieldLines.join('\n')}` : fieldLines.join('\n')
  }
  const next = [...lines.slice(0, start), ...fieldLines, ...lines.slice(end)]
  return next.join('\n')
}

function formatYamlField(key: string, value: string): string {
  const text = value.replace(/\r\n/g, '\n')
  if (!text.includes('\n') && text.length <= 80 && canBePlain(text)) {
    return `${key}: ${text === '' ? '""' : yamlQuote(text)}`
  }
  // Prefer literal block for multi-line / long descriptions (Agent skill style).
  const body = text.split('\n').map((line) => (line.length ? `  ${line}` : '')).join('\n')
  return `${key}: |\n${body}`
}

function canBePlain(value: string): boolean {
  if (!value) return false
  if (/[:#{}[\],&*!|>'"%@`]/.test(value)) return false
  if (/^\s|\s$/.test(value)) return false
  return true
}

function yamlQuote(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return '""'
  if (/^[\w .-]+$/.test(trimmed) && !trimmed.includes(':')) return trimmed
  return JSON.stringify(trimmed)
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    try {
      return JSON.parse(value.startsWith("'") ? `"${value.slice(1, -1)}"` : value) as string
    } catch {
      return value.slice(1, -1)
    }
  }
  return value
}
