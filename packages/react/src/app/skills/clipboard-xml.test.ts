import { describe, expect, test } from 'bun:test'
import { deflateSync } from 'fflate'
import { fromUint8Array } from 'js-base64'

import {
  extractDesignClipboardXML,
  extractDesignClipboardXMLPayloads,
  isDesignClipboardXML,
  normalizeDesignClipboardXML,
  pasteDesignClipboardAsMarkdown,
  skillFileNeedsClipboardJson,
  wrapDesignClipboardXMLForMarkdown
} from '#react/app/skills/clipboard-xml'
import { designClipboardXmlToJson, skillFileTextForPrompt } from '#react/app/skills/clipboard-xml-to-json'

function openPencilClipboardXML(nodes: unknown[]): string {
  const payload = JSON.stringify({
    format: 'openpencil/v1',
    nodes,
    images: { abc: fromUint8Array(new Uint8Array([1, 2, 3])) }
  })
  const compressed = deflateSync(new TextEncoder().encode(payload))
  return `<!--(openpencil)${fromUint8Array(compressed)}(/openpencil)-->`
}

describe('skill design clipboard XML', () => {
  test('detects OpenPencil and Figma clipboard markers', () => {
    expect(isDesignClipboardXML(openPencilClipboardXML([]))).toBe(true)
    expect(isDesignClipboardXML('<!--(figma)payload(/figma)-->')).toBe(false)
    expect(
      isDesignClipboardXML('(figmeta)e30=(/figmeta)<!--(figma)payload(/figma)-->')
    ).toBe(true)
    expect(isDesignClipboardXML('ordinary text')).toBe(false)
  })

  test('paste wraps native XML in a markdown code fence', () => {
    const xml = openPencilClipboardXML([{ id: '1:1', type: 'FRAME', x: 0, y: 0 }])
    const data = {
      getData(type: string) {
        if (type === 'text/html') return xml
        return ''
      }
    } as DataTransfer

    expect(extractDesignClipboardXML(data)).toBe(xml)
    expect(pasteDesignClipboardAsMarkdown(data)).toBe(
      wrapDesignClipboardXMLForMarkdown(xml)
    )
    expect(pasteDesignClipboardAsMarkdown(data)).toContain('```openpencil-xml\n')
    expect(pasteDesignClipboardAsMarkdown(data)).toContain(xml)
    expect(pasteDesignClipboardAsMarkdown(data)?.endsWith('\n```')).toBe(true)
  })

  test('strips Figma text-preview spans after the design payload', () => {
    const meta = 'eyJmaWxlS2V5IjoieCIsInBhc3RlSUQiOjEsImRhdGFUeXBlIjoic2NlbmUifQ=='
    const buffer = 'QUJDRA=='
    const dirty =
      `<meta charset="utf-8">` +
      `<span data-metadata="<!--(figmeta)${meta}(/figmeta)-->"></span>` +
      `<span data-buffer="<!--(figma)${buffer}(/figma)-->"></span>` +
      `<span style="font-size: 20px; white-space: pre-wrap;">PUPU-EMS</span><br>` +
      `<span style="font-size: 14px; white-space: pre-wrap;">菜单总览</span><br>` +
      `<span style="font-size: 14px; white-space: pre-wrap;">请输入关键字搜索知识库文章</span>`

    const cleaned = normalizeDesignClipboardXML(dirty)
    expect(cleaned).toBe(
      `<meta charset='utf-8'>` +
        `<span data-metadata="<!--(figmeta)${meta}(/figmeta)-->"></span>` +
        `<span data-buffer="<!--(figma)${buffer}(/figma)-->"></span>`
    )
    expect(cleaned).not.toContain('PUPU-EMS')
    expect(cleaned).not.toContain('菜单总览')
    expect(cleaned).not.toContain('white-space: pre-wrap')

    const data = {
      getData(type: string) {
        if (type === 'text/html') return dirty
        return ''
      }
    } as DataTransfer
    const pasted = pasteDesignClipboardAsMarkdown(data)
    expect(pasted).toContain('```figma-xml\n')
    expect(pasted).not.toContain('PUPU-EMS')
  })

  test('extracts fenced XML payloads from skill markdown', () => {
    const xml = openPencilClipboardXML([{ id: '1:1', type: 'FRAME', x: 0, y: 0, name: 'Card' }])
    const markdown = `# Skill\n\n${wrapDesignClipboardXMLForMarkdown(xml)}\n\nMore notes.`
    expect(extractDesignClipboardXMLPayloads(markdown)).toEqual([xml])
    expect(skillFileNeedsClipboardJson('SKILL.md', markdown)).toBe(true)
  })

  test('decodes OpenPencil clipboard XML to node JSON for prompts', async () => {
    const xml = openPencilClipboardXML([
      { id: '1:1', type: 'FRAME', x: 0, y: 0, name: 'Card' }
    ])
    const json = await designClipboardXmlToJson(xml)
    expect(json).toBeTruthy()
    const parsed = JSON.parse(json!) as {
      source: string
      nodes: Array<{ name?: string }>
      images: Record<string, string>
    }
    expect(parsed.source).toBe('openpencil-clipboard')
    expect(parsed.nodes[0]?.name).toBe('Card')
    expect(parsed.images.abc).toContain('base64:')
  })

  test('prompt expansion replaces fenced XML with decoded JSON and keeps prose', async () => {
    const xml = openPencilClipboardXML([{ id: '1:1', type: 'FRAME', x: 0, y: 0, name: 'Card' }])
    const markdown = `Use this reference:\n\n${wrapDesignClipboardXMLForMarkdown(xml)}\n\nMatch spacing.`
    const prompt = await skillFileTextForPrompt('SKILL.md', markdown)
    expect(prompt).toContain('Use this reference:')
    expect(prompt).toContain('Match spacing.')
    expect(prompt).toContain('```json')
    expect(prompt).not.toContain('```openpencil-xml')
    expect(prompt).toContain('"name": "Card"')
  })
})
