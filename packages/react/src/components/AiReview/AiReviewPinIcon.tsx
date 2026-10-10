import type { AiReviewSeverity } from '#react/app/document/ai-review/types'
import { BubblePin, bubblePinTipOffset } from '#react/components/canvas/BubblePin'

const SEVERITY_FILL: Record<AiReviewSeverity, string> = {
  error: 'var(--color-danger, #ef4444)',
  warning: '#f59e0b',
  info: 'var(--color-accent, #3b82f6)'
}

export { bubblePinTipOffset as aiReviewPinTipOffset }

/** AI-review pin using the shared bubble silhouette. */
export function AiReviewPinIcon({
  severity,
  index,
  size = 28,
  focused = false,
  className
}: {
  severity: AiReviewSeverity
  index?: number
  size?: number
  focused?: boolean
  className?: string
}) {
  return (
    <BubblePin
      fill={SEVERITY_FILL[severity]}
      size={size}
      focused={focused}
      label={index}
      className={className}
    />
  )
}
