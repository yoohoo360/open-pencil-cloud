import { describe, expect, test } from 'bun:test'
import { deflateSync } from 'fflate'
import { fromUint8Array } from 'js-base64'

import { wrapDesignClipboardXMLForMarkdown } from '#react/app/skills/clipboard-xml'
import { templatesFromSkillFile } from '#react/app/skills/templates'

function openPencilClipboardXML(nodes: unknown[]): string {
  const payload = JSON.stringify({
    format: 'openpencil/v1',
    nodes,
    images: {}
  })
  const compressed = deflateSync(new TextEncoder().encode(payload))
  return `<!--(openpencil)${fromUint8Array(compressed)}(/openpencil)-->`
}

describe('skill design templates', () => {
  test('extracts fenced clipboard XML as insertable templates and strips raw XML from prompt', async () => {
    const xml = openPencilClipboardXML([
      { id: '1:1', type: 'FRAME', x: 0, y: 0, name: 'Card' }
    ])
    const markdown = `# Skill\n\nUse the card.\n\n${wrapDesignClipboardXMLForMarkdown(xml)}\n`
    const loaded = await templatesFromSkillFile('ui-kit', 'SKILL.md', markdown, 0)

    expect(loaded.templates).toHaveLength(1)
    expect(loaded.templates[0]?.id).toBe('ui-kit/0')
    expect(loaded.templates[0]?.xml).toBe(xml)
    expect(loaded.promptBody).toContain('insert_skill_template')
    expect(loaded.promptBody).toContain('ui-kit/0')
    expect(loaded.promptBody).not.toContain('```openpencil-xml')
    expect(loaded.promptBody).toContain('Use the card.')
  })
})
