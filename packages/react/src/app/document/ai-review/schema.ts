import * as v from 'valibot'

import type { AiReviewPayload } from '#react/app/document/ai-review/types'

const BoundsSchema = v.object({
  x: v.number(),
  y: v.number(),
  w: v.number(),
  h: v.number()
})

const CommentSchema = v.object({
  id: v.string(),
  body: v.string(),
  severity: v.picklist(['error', 'warning', 'info']),
  source: v.picklist(['ai', 'human']),
  created_at: v.number(),
  created_by: v.optional(
    v.object({
      id: v.string(),
      name: v.optional(v.string())
    })
  ),
  status: v.picklist(['open', 'accepted', 'dismissed']),
  edit: v.optional(
    v.object({
      original: v.optional(v.string()),
      proposed: v.optional(v.string())
    })
  )
})

const MarkerSchema = v.object({
  id: v.string(),
  node_id: v.string(),
  node_name: v.optional(v.string()),
  bounds: v.optional(BoundsSchema),
  comments: v.array(CommentSchema)
})

export const AiReviewPayloadSchema = v.object({
  version: v.literal(1),
  requirement: v.optional(
    v.object({
      title: v.optional(v.string()),
      content: v.string()
    })
  ),
  page_id: v.string(),
  markers: v.array(MarkerSchema),
  skills: v.optional(
    v.object({
      group_ids: v.array(v.string()),
      skill_ids: v.array(v.string())
    })
  ),
  ai: v.optional(
    v.object({
      model: v.optional(v.string()),
      summary: v.optional(v.string()),
      ran_at: v.optional(v.number())
    })
  ),
  history_id: v.optional(v.string())
})

/** AI may return a partial findings object; normalize into a payload patch. */
export const AiReviewFindingsSchema = v.object({
  summary: v.optional(v.string()),
  markers: v.array(
    v.object({
      node_id: v.string(),
      comments: v.array(
        v.object({
          body: v.string(),
          severity: v.optional(v.picklist(['error', 'warning', 'info'])),
          edit: v.optional(
            v.object({
              original: v.optional(v.string()),
              proposed: v.optional(v.string())
            })
          )
        })
      )
    })
  )
})

export type AiReviewFindings = v.InferOutput<typeof AiReviewFindingsSchema>

export function parseAiReviewPayload(value: unknown): AiReviewPayload | null {
  const result = v.safeParse(AiReviewPayloadSchema, value)
  return result.success ? result.output : null
}

export function parseAiReviewFindings(value: unknown): AiReviewFindings | null {
  const result = v.safeParse(AiReviewFindingsSchema, value)
  return result.success ? result.output : null
}

/** Extract the first JSON object from a model reply (fences or bare). */
export function extractJsonObject(text: string): unknown | null {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() ?? trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  const slice = candidate.slice(start, end + 1)
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson()), slice)
  return parsed.success ? parsed.output : null
}
