import { Blend, Eye, EyeOff, SquareRoundCorner } from 'lucide-react'
import { useState } from 'react'

import { ScrubInput } from '@/react_app/pickers/ScrubInput'
import { sectionWrapper } from '@/react_app/ui/section'
import { Tip, TipProvider } from '@/react_app/ui/Tip'
import { useAppearance, useI18n } from '@open-pencil/react'

export function AppearanceSection() {
  const { panels } = useI18n()
  const {
    node,
    isMulti,
    active,
    hasCornerRadius,
    independentCorners,
    cornerRadiusValue,
    opacityPercent,
    visibilityState,
    updateProp,
    commitProp,
    toggleVisibility,
    toggleIndependentCorners,
    updateCornerProp,
    commitCornerProp
  } = useAppearance()

  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null)

  const showIndependentCorners = (() => {
    if (manualExpanded !== null) return manualExpanded
    if (independentCorners === true) return true
    if (!node) return false
    return !(
      node.topLeftRadius === node.topRightRadius &&
      node.topLeftRadius === node.bottomRightRadius &&
      node.topLeftRadius === node.bottomLeftRadius
    )
  })()

  function onToggleCorners() {
    setManualExpanded(!showIndependentCorners)
    toggleIndependentCorners()
  }

  if (!active) return null

  return (
    <TipProvider>
      <div data-test-id="appearance-section" className={sectionWrapper()}>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-[11px] text-muted">{panels.appearance}</label>
          <Tip label={panels.toggleVisibility}>
            <button
              type="button"
              data-test-id="appearance-visibility"
              className={`flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-0.5 text-muted hover:bg-hover hover:text-surface ${
                visibilityState === 'hidden' ? 'text-accent' : ''
              }`}
              onClick={toggleVisibility}
            >
              {visibilityState === 'hidden' ? (
                <EyeOff className="size-3.5" />
              ) : visibilityState === 'mixed' ? (
                <Eye className="size-3.5 opacity-50" />
              ) : (
                <Eye className="size-3.5" />
              )}
            </button>
          </Tip>
        </div>

        <div className="flex gap-1.5">
          <ScrubInput
            suffix="%"
            value={opacityPercent}
            min={0}
            max={100}
            onValueChange={(v) => updateProp('opacity', v / 100)}
            onCommit={(v, p) => commitProp('opacity', v / 100, p / 100)}
            iconSlot={<Blend className="size-3" />}
          />

          {hasCornerRadius ? (
            <>
              {!showIndependentCorners ? (
                <ScrubInput
                  value={cornerRadiusValue}
                  min={0}
                  onValueChange={(v) => updateProp('cornerRadius', v)}
                  onCommit={(v, p) => commitProp('cornerRadius', v, p)}
                  iconSlot={<SquareRoundCorner className="size-3" />}
                />
              ) : null}
              <Tip label={panels.independentCornerRadii}>
                <button
                  type="button"
                  data-test-id="independent-corners-toggle"
                  className={`flex size-[26px] shrink-0 cursor-pointer items-center justify-center rounded border border-border bg-input text-muted hover:bg-hover hover:text-surface ${
                    showIndependentCorners ? '!border-accent !text-accent' : ''
                  }`}
                  onClick={onToggleCorners}
                >
                  <svg
                    className="size-3"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M1 4V2.5A1.5 1.5 0 0 1 2.5 1H4" />
                    <path d="M8 1h1.5A2.5 2.5 0 0 1 11 3.5V5" />
                    <path d="M11 8v1a2 2 0 0 1-2 2H8" />
                    <path d="M4 11H3a2 2 0 0 1-2-2V8" />
                  </svg>
                </button>
              </Tip>
            </>
          ) : null}
        </div>

        {hasCornerRadius && showIndependentCorners && !isMulti && node ? (
          <div data-test-id="independent-corners-grid" className="mt-1.5 grid grid-cols-2 gap-1.5">
            {(
              [
                {
                  key: 'topLeftRadius' as const,
                  path: 'M1 11V4a3 3 0 0 1 3-3h7'
                },
                {
                  key: 'topRightRadius' as const,
                  path: 'M11 11V4a3 3 0 0 0-3-3H1'
                },
                {
                  key: 'bottomLeftRadius' as const,
                  path: 'M1 1v7a3 3 0 0 0 3 3h7'
                },
                {
                  key: 'bottomRightRadius' as const,
                  path: 'M11 1v7a3 3 0 0 1-3 3H1'
                }
              ] as const
            ).map((corner) => (
              <ScrubInput
                key={corner.key}
                value={node[corner.key]}
                min={0}
                onValueChange={(v) => updateCornerProp(corner.key, v)}
                onCommit={(v, p) => commitCornerProp(corner.key, v, p)}
                iconSlot={
                  <svg
                    className="size-3"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d={corner.path} />
                  </svg>
                }
              />
            ))}
          </div>
        ) : null}
      </div>
    </TipProvider>
  )
}
