import type { ReactNode } from 'react'

/** Circle + bottom-left corner tip (same silhouette as the review/comment pin). */
const PIN_PATH =
  'M512 85.333333a426.666667 426.666667 0 0 1 426.666667 426.666667 426.666667 426.666667 0 0 1-426.666667 426.666667H213.333333a128 128 0 0 1-128-128v-298.666667A426.666667 426.666667 0 0 1 512 85.333333z'

/** Tip sits at the bottom-left of the viewBox (icon units). */
export const BUBBLE_PIN_TIP = { x: 85.333333, y: 896 } as const

/** CSS translate so the bottom-left tip lands on the canvas anchor. */
export function bubblePinTipOffset(size: number): string {
  const x = (BUBBLE_PIN_TIP.x / 1024) * size
  const y = (BUBBLE_PIN_TIP.y / 1024) * size
  return `translate(${-x}px, ${-y}px)`
}

/**
 * Shared canvas pin for comments and AI review markers.
 * Round body with a pointed corner at bottom-left.
 */
export function BubblePin({
  fill,
  size = 28,
  focused = false,
  label,
  children,
  className
}: {
  fill: string
  size?: number
  focused?: boolean
  /** Centered text (e.g. index or initial). Ignored when `children` is set. */
  label?: string | number
  children?: ReactNode
  className?: string
}) {
  // viewBox is 1024 — digit sized for the circular mass without crowding.
  const fontSize = size >= 24 ? 400 : size >= 18 ? 360 : 320
  return (
    <span
      className={[
        'relative inline-flex overflow-visible drop-shadow-sm',
        focused ? 'scale-110' : '',
        className ?? ''
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 1024 1024"
        className="overflow-visible"
        aria-hidden
      >
        <path d={PIN_PATH} fill="white" transform="translate(32 32) scale(0.94)" />
        <path d={PIN_PATH} fill={fill} />
        {children == null && label != null ? (
          <text
            x="540"
            y="548"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={fontSize}
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            {label}
          </text>
        ) : null}
      </svg>
      {children ? (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{
            // Keep content in the circular mass, away from the tip.
            paddingLeft: size * 0.12,
            paddingBottom: size * 0.08
          }}
        >
          {children}
        </span>
      ) : null}
    </span>
  )
}
