/** Tagged sections streamed by the AI review model. */
export type AiReviewStreamArtifacts = {
  thinking: string
  analysis: string
  findingsText: string
}

function extractTaggedSection(text: string, name: string): string {
  const open = `<${name}>`
  const start = text.toLowerCase().indexOf(open.toLowerCase())
  if (start < 0) return ''
  const contentStart = start + open.length
  const close = `</${name}>`
  const end = text.toLowerCase().indexOf(close.toLowerCase(), contentStart)
  if (end >= 0) return text.slice(contentStart, end).trim()
  const rest = text.slice(contentStart)
  const nextTag = rest.search(/<(?:thinking|analysis|findings)(?:\s|>)/i)
  return (nextTag >= 0 ? rest.slice(0, nextTag) : rest).trim()
}

export function parseAiReviewStream(text: string): AiReviewStreamArtifacts {
  return {
    thinking: extractTaggedSection(text, 'thinking'),
    analysis: extractTaggedSection(text, 'analysis'),
    findingsText: extractTaggedSection(text, 'findings')
  }
}

export function lastNonEmptyLine(text: string): string {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  return lines[lines.length - 1] ?? ''
}
