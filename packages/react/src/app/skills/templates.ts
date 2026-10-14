import {
  designClipboardFenceLanguage,
  extractDesignClipboardXMLPayloads,
  normalizeDesignClipboardXML
} from '#react/app/skills/clipboard-xml'
import { designClipboardXmlToJson } from '#react/app/skills/clipboard-xml-to-json'
import { isBuiltinMakeSkillId } from '#react/app/make/skills/default-make-skill'
import { skillAPI, type PencilSkill, type SkillEntry } from '#react/lib/client'

export type SkillDesignTemplate = {
  id: string
  skillKey: string
  label: string
  xml: string
  /** Short structure hint for the model (not the full node tree). */
  summary: string
}

function flattenFiles(nodes: SkillEntry[]): SkillEntry[] {
  const out: SkillEntry[] = []
  for (const node of nodes) {
    if (node.kind === 'file') out.push(node)
    if (node.children?.length) out.push(...flattenFiles(node.children))
  }
  return out
}

async function summarizeClipboardXML(xml: string): Promise<string> {
  const json = await designClipboardXmlToJson(xml)
  if (!json) return 'design clipboard'
  try {
    const parsed = JSON.parse(json) as {
      source?: string
      nodeCount?: number
      nodes?: Array<{ name?: string; type?: string }>
    }
    const roots = (parsed.nodes ?? [])
      .slice(0, 8)
      .map((node) => {
        const type = typeof node.type === 'string' ? node.type : '?'
        const name = typeof node.name === 'string' && node.name ? node.name : type
        return `${type}:${name}`
      })
    const more =
      (parsed.nodeCount ?? parsed.nodes?.length ?? 0) > roots.length
        ? ` (+${(parsed.nodeCount ?? parsed.nodes?.length ?? 0) - roots.length} more)`
        : ''
    const source = parsed.source === 'figma-clipboard' ? 'figma' : 'openpencil'
    return `${source} [${roots.join(', ') || 'nodes'}]${more}`
  } catch {
    return designClipboardFenceLanguage(xml)
  }
}

/** Pull design-clipboard templates out of one skill file's markdown / XML. */
export async function templatesFromSkillFile(
  skillKey: string,
  path: string,
  content: string,
  indexStart: number
): Promise<{ templates: SkillDesignTemplate[]; promptBody: string }> {
  const body = content ?? ''
  const payloads = extractDesignClipboardXMLPayloads(body)
  if (payloads.length === 0) {
    return { templates: [], promptBody: body.trim() ? `### ${path}\n${body}` : `### ${path}\n(empty)` }
  }

  const templates: SkillDesignTemplate[] = []
  let promptBody = body
  let index = indexStart

  const fenceRe = /(`{3,})([^\n`]*)\n([\s\S]*?)\1/g
  const replacements: Array<{ from: string; to: string }> = []

  for (const match of body.matchAll(fenceRe)) {
    const code = match[3] ?? ''
    const xml = normalizeDesignClipboardXML(code)
    if (!xml) continue
    const id = `${skillKey}/${index}`
    const summary = await summarizeClipboardXML(xml)
    const label = `${path} #${index + 1}`
    templates.push({ id, skillKey, label, xml, summary })
    replacements.push({
      from: match[0],
      to:
        `> Design template \`${id}\` (${summary}). ` +
        `Call \`insert_skill_template\` with \`template_id: "${id}"\` to place these nodes, then modify with batch_update / set_* / describe.`
    })
    index += 1
  }

  if (replacements.length > 0) {
    for (const { from, to } of replacements) {
      promptBody = promptBody.replace(from, to)
    }
    return { templates, promptBody: `### ${path}\n${promptBody}` }
  }

  // Whole-file raw XML.
  const xml = payloads[0]
  if (xml && !/`{3,}/.test(body)) {
    const id = `${skillKey}/${index}`
    const summary = await summarizeClipboardXML(xml)
    templates.push({
      id,
      skillKey,
      label: path,
      xml,
      summary
    })
    return {
      templates,
      promptBody:
        `### ${path}\n` +
        `> Design template \`${id}\` (${summary}). ` +
        `Call \`insert_skill_template\` with \`template_id: "${id}"\` to place these nodes, then modify with batch_update / set_* / describe.`
    }
  }

  return { templates, promptBody: `### ${path}\n${body}` }
}

/** Load skill markdown for the design agent plus insertable clipboard templates. */
export async function loadSkillPackageForDesign(skill: PencilSkill): Promise<{
  body: string
  templates: SkillDesignTemplate[]
}> {
  const skillKey = skill.skill_key || skill.id
  if (isBuiltinMakeSkillId(skill.id) || skill.id === 'inline-ai') {
    return templatesFromSkillFile(skillKey, 'SKILL.md', skill.content ?? '', 0)
  }

  try {
    const response = await skillAPI.tree(skill.id)
    const files = flattenFiles(response.data ?? []).sort((a, b) => {
      if (a.path === 'SKILL.md') return -1
      if (b.path === 'SKILL.md') return 1
      return a.path.localeCompare(b.path)
    })
    if (files.length === 0) {
      return templatesFromSkillFile(skillKey, 'SKILL.md', skill.content ?? '', 0)
    }

    const templates: SkillDesignTemplate[] = []
    const parts: string[] = []
    let index = 0
    for (const file of files) {
      const loaded = await templatesFromSkillFile(skillKey, file.path, file.content ?? '', index)
      templates.push(...loaded.templates)
      parts.push(loaded.promptBody)
      index += loaded.templates.length
    }
    return { body: parts.join('\n\n'), templates }
  } catch {
    return templatesFromSkillFile(skillKey, 'SKILL.md', skill.content ?? '', 0)
  }
}

export function formatSkillTemplatesCatalog(templates: SkillDesignTemplate[]): string {
  if (templates.length === 0) {
    return '(No design clipboard templates in loaded skills.)'
  }
  return templates
    .map((template) => `- \`${template.id}\` — ${template.label}: ${template.summary}`)
    .join('\n')
}
