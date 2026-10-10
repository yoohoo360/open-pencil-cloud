import { mergeAiFindings } from '#react/app/document/ai-review/merge'
import { markerFromNodeId } from '#react/app/document/ai-review/markers'
import {
  extractJsonObject,
  parseAiReviewFindings,
  type AiReviewFindings
} from '#react/app/document/ai-review/schema'
import {
  loadSelectedSkillPromptBlock,
  skillSelectionOf
} from '#react/app/document/ai-review/skills'
import { parseAiReviewStream, type AiReviewStreamArtifacts } from '#react/app/document/ai-review/stream-parse'
import type { AiReviewPayload } from '#react/app/document/ai-review/types'
import { streamTextCompletion } from '#react/app/ai/chat/text-stream'
import {
  chatProviderSettings,
  isChatConfigured,
  type ChatProviderSettings
} from '#react/app/ai/chat/settings'
import type { EditorStore } from '#react/app/editor/store'
import { executeDesignTool } from '#react/app/ai/chat/tools'
import { readActiveOrgId } from '#react/app/org/active'
import { LOCALE_LABELS, locale, type Locale } from '#react/i18n/locale'
import { skillAPI, type SkillCatalogCategory } from '#react/lib/client'

export { mergeAiFindings } from '#react/app/document/ai-review/merge'
export type { AiReviewStreamArtifacts }

function buildSystemPrompt(reviewLocale: Locale): string {
  const language = LOCALE_LABELS[reviewLocale]
  return `You are a product design AI reviewer.
Given a requirement text (optional), design nodes (a selection or the current page), and optional organization skills, find gaps, conflicts, missing states, and unclear copy.
Apply the provided skills as review criteria when present.

Language: write all human-readable review text in ${language} (locale ${reviewLocale}). This includes <thinking>, <analysis>, "summary", comment "body", and any "edit" strings. Keep JSON keys, severity enums ("error" | "warning" | "info"), and node_id values unchanged.

Stream your reply in this exact order (use these XML tags):
<thinking>
Brief internal reasoning while you inspect the requirement and nodes.
</thinking>
<analysis>
Structured analysis: what looks solid, what is missing, conflicts with skills or requirement.
</analysis>
<findings>
{
  "summary": "short overall summary",
  "markers": [
    {
      "node_id": "existing node id",
      "comments": [
        {
          "body": "what is wrong or unclear",
          "severity": "error" | "warning" | "info",
          "edit": { "original": "optional", "proposed": "optional" }
        }
      ]
    }
  ]
}
</findings>

Only reference node_id values that appear in the input. Prefer concrete, actionable comments.
Do not wrap the findings JSON in markdown fences.`
}

async function describeNodes(store: EditorStore, nodeIds: string[]): Promise<string> {
  if (nodeIds.length === 0) return '[]'
  // Omit depth so describe uses autoDepth (shallower on large pages).
  const result = await executeDesignTool(store, 'describe', { ids: nodeIds })
  if (!result.ok) return `[]`
  try {
    return JSON.stringify(result.result, null, 2)
  } catch {
    return '[]'
  }
}

/** Markers if any; otherwise the current page. */
function resolveReviewNodeIds(store: EditorStore, payload: AiReviewPayload): {
  nodeIds: string[]
  scope: 'selection' | 'page'
} {
  const markerIds = payload.markers.map((marker) => marker.node_id)
  if (markerIds.length > 0) return { nodeIds: markerIds, scope: 'selection' }
  const pageId = payload.page_id || store.state.currentPageId
  return { nodeIds: pageId ? [pageId] : [], scope: 'page' }
}

async function loadSkillCatalog(): Promise<SkillCatalogCategory[]> {
  try {
    const response = await skillAPI.catalog({ org_id: readActiveOrgId() || undefined })
    return response.data ?? []
  } catch {
    return []
  }
}

export async function runAiReview(options: {
  store: EditorStore
  payload: AiReviewPayload
  requirement: string
  /** UI locale; defaults to the app language setting. */
  locale?: Locale
  settings?: ChatProviderSettings
  signal?: AbortSignal
  onArtifacts?: (artifacts: AiReviewStreamArtifacts) => void
}): Promise<{ payload: AiReviewPayload; findings: AiReviewFindings; artifacts: AiReviewStreamArtifacts }> {
  const settings = options.settings ?? chatProviderSettings.get()
  if (!isChatConfigured(settings)) {
    throw new Error('Configure an AI provider API key before running AI review.')
  }
  const reviewLocale = options.locale ?? locale.get()
  const { nodeIds, scope } = resolveReviewNodeIds(options.store, options.payload)
  if (nodeIds.length === 0) {
    throw new Error('No page is open to review.')
  }
  const scene = await describeNodes(options.store, nodeIds)
  const requirement = options.requirement.trim()
  const selection = skillSelectionOf(options.payload)
  const categories = await loadSkillCatalog()
  const skillsBlock = await loadSelectedSkillPromptBlock(categories, selection)
  const scopeLabel =
    scope === 'selection' ? 'Selected nodes' : 'Current page (no selection — reviewing the whole page)'
  const userContent = [
    requirement
      ? `Requirement:\n${requirement}`
      : 'Requirement: (none provided — review the design alone)',
    `${scopeLabel}:\n${scene}`,
    `Output language: ${LOCALE_LABELS[reviewLocale]} (${reviewLocale})`,
    skillsBlock || undefined
  ]
    .filter((part): part is string => Boolean(part))
    .join('\n\n')

  const { text } = await streamTextCompletion({
    apiKey: settings.apiKey,
    baseURL: settings.baseURL,
    model: settings.model,
    signal: options.signal,
    messages: [
      { role: 'system', content: buildSystemPrompt(reviewLocale) },
      { role: 'user', content: userContent }
    ],
    onDelta: (delta) => {
      options.onArtifacts?.(parseAiReviewStream(delta))
    }
  })

  const artifacts = parseAiReviewStream(text)
  options.onArtifacts?.(artifacts)

  const raw =
    extractJsonObject(artifacts.findingsText) ?? extractJsonObject(text)
  const findings = parseAiReviewFindings(raw)
  if (!findings) {
    throw new Error('AI review returned invalid findings JSON. Try again.')
  }
  return {
    findings,
    artifacts,
    payload: mergeAiFindings(
      { ...options.payload, skills: selection },
      findings,
      {
        model: settings.model,
        resolveMarker: (nodeId) => markerFromNodeId(options.store, nodeId)
      }
    )
  }
}
