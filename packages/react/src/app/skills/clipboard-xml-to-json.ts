import { inflateSync } from 'fflate'
import { isValid, toUint8Array } from 'js-base64'
import * as v from 'valibot'

import { parseFigmaClipboard } from '@open-pencil/core/clipboard'
import {
  extractDesignClipboardXMLPayloads,
  isDesignClipboardXML,
  normalizeDesignClipboardXML
} from '#react/app/skills/clipboard-xml'

const OpenPencilClipboardPayload = v.pipe(
  v.string(),
  v.parseJson(),
  v.object({
    format: v.literal('openpencil/v1'),
    nodes: v.array(v.unknown()),
    images: v.optional(v.record(v.string(), v.unknown()))
  })
)

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Uint8Array) return `<bytes:${value.byteLength}>`
  return value
}

function pretty(value: unknown): string {
  return JSON.stringify(value, jsonReplacer, 2)
}

function decodeOpenPencilClipboardJSON(xml: string): string | null {
  const match = xml.match(/<!--\(openpencil\)(.*?)\(\/openpencil\)-->/s)
  if (!match) return null
  if (!isValid(match[1])) return null
  const raw = toUint8Array(match[1])
  let bytes: Uint8Array
  try {
    bytes = inflateSync(raw)
  } catch {
    bytes = raw
  }
  const decoded = v.safeParse(OpenPencilClipboardPayload, new TextDecoder().decode(bytes))
  if (!decoded.success) return null
  const images = decoded.output.images ?? {}
  const imageSummary = Object.fromEntries(
    Object.entries(images).map(([hash, payload]) => [
      hash,
      typeof payload === 'string' ? `<base64:${payload.length} chars>` : '<omitted>'
    ])
  )
  return pretty({
    source: 'openpencil-clipboard',
    format: decoded.output.format,
    nodes: decoded.output.nodes,
    images: imageSummary
  })
}

async function decodeFigmaClipboardJSON(xml: string): Promise<string | null> {
  const figma = await parseFigmaClipboard(xml)
  if (!figma) return null
  return pretty({
    source: 'figma-clipboard',
    meta: figma.meta,
    nodeCount: figma.nodes.length,
    blobCount: figma.blobs.length,
    nodes: figma.nodes,
    blobs: figma.blobs.map((bytes) => `<bytes:${bytes.byteLength}>`)
  })
}

/**
 * Convert pasted native OpenPencil / Figma clipboard XML into node JSON for AI prompts.
 * Image and binary blob payloads are summarized so the model sees structure, not bytes.
 */
export async function designClipboardXmlToJson(xml: string): Promise<string | null> {
  const normalized = normalizeDesignClipboardXML(xml)
  if (!normalized) return null

  const openPencil = decodeOpenPencilClipboardJSON(normalized)
  if (openPencil) return openPencil

  try {
    return await decodeFigmaClipboardJSON(normalized)
  } catch {
    return null
  }
}

async function expandMarkdownDesignFences(body: string): Promise<string> {
  const fenceRe = /(`{3,})([^\n`]*)\n([\s\S]*?)\1/g
  let result = ''
  let lastIndex = 0
  for (const match of body.matchAll(fenceRe)) {
    const index = match.index ?? 0
    result += body.slice(lastIndex, index)
    const fence = match[1] ?? '```'
    const lang = match[2] ?? ''
    const code = match[3] ?? ''
    if (isDesignClipboardXML(code)) {
      const json = await designClipboardXmlToJson(code)
      result += json ? `${fence}json\n${json}\n${fence}` : match[0]
    } else {
      result += match[0]
    }
    lastIndex = index + match[0].length
  }
  result += body.slice(lastIndex)
  return result
}

/**
 * Expand a skill package file for the model: storage keeps fenced original XML;
 * the prompt substitutes those fences with decoded node JSON.
 */
export async function skillFileTextForPrompt(path: string, content: string): Promise<string> {
  const body = content ?? ''
  if (!body.trim()) return `### ${path}\n(empty)`

  const payloads = extractDesignClipboardXMLPayloads(body)
  if (payloads.length === 0) return `### ${path}\n${body}`

  const trimmed = body.trim()
  // Whole-file raw XML (no markdown fence): only emit decoded JSON.
  if (payloads.length === 1 && isDesignClipboardXML(trimmed) && !/`{3,}/.test(trimmed)) {
    const json = await designClipboardXmlToJson(payloads[0])
    if (!json) {
      return `### ${path}\n(design clipboard XML present but could not be decoded)`
    }
    return `### ${path} (decoded design clipboard nodes)\n\`\`\`json\n${json}\n\`\`\``
  }

  const expanded = await expandMarkdownDesignFences(body)
  return `### ${path}\n${expanded}`
}
