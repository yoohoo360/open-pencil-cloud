import { lastNonEmptyLine } from '#react/app/document/ai-review/stream-parse'
import type { AiReviewStreamArtifacts } from '#react/app/document/ai-review/stream-parse'
import { useI18n } from '#react/i18n'
import { ChevronDown, LoaderCircle } from 'lucide-react'
import { useState } from 'react'

function AnimatedEllipsis() {
  return (
    <span className="inline-flex gap-px text-[11px] text-muted" aria-hidden>
      <span className="animate-bounce [animation-delay:0ms]">.</span>
      <span className="animate-bounce [animation-delay:150ms]">.</span>
      <span className="animate-bounce [animation-delay:300ms]">.</span>
    </span>
  )
}

function CollapsedSection({
  title,
  text,
  active = false,
  emptyActiveLabel
}: {
  title: string
  text: string
  active?: boolean
  emptyActiveLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const preview = lastNonEmptyLine(text)

  return (
    <div
      data-test-id="ai-review-collapsed-section"
      className="overflow-hidden rounded-lg border border-border/80 bg-panel"
    >
      <button
        type="button"
        className="flex w-full items-start gap-2 px-2.5 py-1.5 text-left hover:bg-hover"
        onClick={() => setOpen((value) => !value)}
      >
        {active ? (
          <LoaderCircle className="mt-0.5 size-3 shrink-0 animate-spin text-muted" />
        ) : (
          <ChevronDown
            className={`mt-0.5 size-3 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium text-muted">
            {title}
            {active ? (
              <span className="ml-1 font-normal">
                <AnimatedEllipsis />
              </span>
            ) : null}
          </span>
          {!open ? (
            <span className="mt-0.5 block truncate text-[11px] text-surface/80">
              {preview || (active ? emptyActiveLabel : '')}
              {active && preview ? (
                <span className="ml-0.5">
                  <AnimatedEllipsis />
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
      </button>
      {open && text.trim() ? (
        <div className="border-t border-border/60 px-2.5 py-2">
          <pre className="m-0 whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-muted">
            {text}
            {active ? (
              <span className="ml-0.5">
                <AnimatedEllipsis />
              </span>
            ) : null}
          </pre>
        </div>
      ) : null}
    </div>
  )
}

/** Streaming think / analysis sections (codegen-style, no chat). */
export function AiReviewProcess({
  artifacts,
  running
}: {
  artifacts: AiReviewStreamArtifacts
  running: boolean
}) {
  const { panels, dialogs } = useI18n()
  const thinkingActive = running && !artifacts.analysis.trim()
  const analysisActive = running && Boolean(artifacts.thinking.trim() || artifacts.analysis.trim())

  if (
    !running &&
    !artifacts.thinking.trim() &&
    !artifacts.analysis.trim()
  ) {
    return null
  }

  return (
    <div className="space-y-1.5" data-test-id="ai-review-process">
      {artifacts.thinking.trim() || thinkingActive || running ? (
        <CollapsedSection
          title={thinkingActive || running ? panels.codegenThinking : panels.codegenThought}
          text={artifacts.thinking}
          active={thinkingActive || (running && !artifacts.analysis.trim())}
          emptyActiveLabel={panels.codegenThinking}
        />
      ) : null}
      {artifacts.analysis.trim() || analysisActive ? (
        <CollapsedSection
          title={dialogs.aiReviewAnalysis}
          text={artifacts.analysis}
          active={running && Boolean(artifacts.analysis.trim() || artifacts.thinking.trim())}
          emptyActiveLabel={dialogs.aiReviewAnalysis}
        />
      ) : null}
    </div>
  )
}
