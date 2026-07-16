import { useState } from 'react'

import { ColorInput } from '@/react_app/pickers/ColorInput'
import { ScrubInput } from '@/react_app/pickers/ScrubInput'
import { ColorStyleRow } from '@/react_app/properties/ColorStyleRow'
import { AppSelect } from '@/react_app/ui/AppSelect'
import { iconButton } from '@/react_app/ui/iconButton'
import { sectionLabel, sectionWrapper } from '@/react_app/ui/section'
import { Tip, TipProvider } from '@/react_app/ui/Tip'
import {
  applySolidStrokeColor,
  PropertyListRoot,
  useColorVariableBinding,
  useI18n,
  useOkHCL,
  useStrokeControls
} from '@open-pencil/react'

import type { SceneNode, Stroke } from '@open-pencil/core'

export function StrokeSection() {
  const strokeCtx = useStrokeControls()
  const strokeVarCtx = useColorVariableBinding('strokes')
  const okhcl = useOkHCL()
  const { panels } = useI18n()
  const [expandedSides, setExpandedSides] = useState(false)

  function onToggleSides(activeNode: SceneNode) {
    const next = !expandedSides
    setExpandedSides(next)
    if (next && !activeNode.independentStrokeWeights) {
      const weight = activeNode.strokes[0]?.weight ?? 1
      strokeCtx.selectSide('CUSTOM', {
        ...activeNode,
        borderTopWeight: weight,
        borderRightWeight: weight,
        borderBottomWeight: weight,
        borderLeftWeight: weight
      } as SceneNode)
    } else if (!next && activeNode.independentStrokeWeights) {
      strokeCtx.selectSide('ALL', activeNode)
    }
  }

  return (
    <TipProvider>
      <PropertyListRoot propKey="strokes" label={panels.stroke}>
        {({ items, isMixed, activeNode, add, remove, patch, toggleVisibility }) => (
          <div data-test-id="stroke-section" className={sectionWrapper()}>
            <div className="flex items-center justify-between">
              <label className={sectionLabel()}>{panels.stroke}</label>
              <button
                type="button"
                data-test-id="stroke-section-add"
                className={iconButton()}
                onClick={() => add(strokeCtx.defaultStroke)}
              >
                +
              </button>
            </div>

            {isMixed ? <p className="text-[11px] text-muted">{panels.mixedStrokesHelp}</p> : null}

            {(items as Stroke[]).map((stroke, i) => (
              <ColorStyleRow
                key={`${i}:${stroke.visible ? 'visible' : 'hidden'}`}
                item={stroke}
                index={i}
                activeNodeId={activeNode?.id ?? null}
                bindingApi={strokeVarCtx}
                visibilityTestId={`stroke-visibility-${i}`}
                unbindTestId="stroke-unbind-variable"
                data-test-id="stroke-item"
                data-test-index={i}
                onPatch={(changes) => patch(i, changes)}
                onToggleVisibility={() => toggleVisibility(i)}
                onRemove={() => remove(i)}
              >
                <ColorInput
                  className="min-w-0 flex-1"
                  color={stroke.color}
                  okhcl={
                    activeNode
                      ? {
                          fieldFormat: okhcl.getFieldFormat(activeNode, i, 'stroke'),
                          fieldOptions: okhcl.fieldOptions,
                          okhcl: okhcl.getStrokeOkHCLColor(activeNode, i),
                          ...okhcl.getStrokePreviewInfo(activeNode, i),
                          setFieldFormat: (event) =>
                            okhcl.setStrokeFieldFormat(activeNode, i, event),
                          updateOkHCL: (event) => okhcl.updateStrokeOkHCL(activeNode, i, event)
                        }
                      : null
                  }
                  editable
                  onUpdate={(c) => patch(i, applySolidStrokeColor(c))}
                />
              </ColorStyleRow>
            ))}

            {!isMixed && (items as unknown[]).length > 0 && activeNode ? (
              <div className="mt-1 flex items-center gap-1.5">
                <AppSelect
                  className="w-[72px]"
                  value={strokeCtx.currentAlign(activeNode)}
                  options={strokeCtx.alignOptions}
                  onValueChange={(v) => strokeCtx.updateAlign(v as Stroke['align'], activeNode)}
                />
                {!expandedSides ? (
                  <ScrubInput
                    className="flex-1"
                    value={activeNode.strokes[0]?.weight ?? 1}
                    min={0}
                    onValueChange={(v) => patch(0, { weight: v })}
                    iconSlot={
                      <svg
                        className="size-3"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <line x1="1" y1="3" x2="11" y2="3" />
                        <line x1="1" y1="6" x2="11" y2="6" />
                        <line x1="1" y1="9" x2="11" y2="9" />
                      </svg>
                    }
                  />
                ) : null}
                <Tip label={panels.strokeSides}>
                  <button
                    type="button"
                    data-test-id="stroke-sides-toggle"
                    className={`flex size-[26px] shrink-0 cursor-pointer items-center justify-center rounded border border-border bg-input text-muted hover:bg-hover hover:text-surface ${
                      expandedSides ? '!border-accent !text-accent' : ''
                    }`}
                    onClick={() => onToggleSides(activeNode)}
                  >
                    <svg className="size-3.5" viewBox="0 0 14 14" fill="currentColor">
                      <rect x="1" y="1" width="5" height="5" rx="1" />
                      <rect x="8" y="1" width="5" height="5" rx="1" />
                      <rect x="1" y="8" width="5" height="5" rx="1" />
                      <rect x="8" y="8" width="5" height="5" rx="1" />
                    </svg>
                  </button>
                </Tip>
              </div>
            ) : null}

            {!isMixed && (items as unknown[]).length > 0 && expandedSides && activeNode ? (
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {strokeCtx.borderSides.map((side) => (
                  <ScrubInput
                    key={side}
                    value={
                      activeNode[
                        `border${side[0].toUpperCase()}${side.slice(1)}Weight` as keyof SceneNode
                      ] as number
                    }
                    min={0}
                    onValueChange={(v) => strokeCtx.updateBorderWeight(side, v, activeNode)}
                    iconSlot={
                      <svg className="size-3" viewBox="0 0 12 12" fill="none" strokeWidth="1.5">
                        <rect
                          x="1"
                          y="1"
                          width="10"
                          height="10"
                          rx="1"
                          stroke="currentColor"
                          strokeOpacity="0.3"
                          strokeDasharray="2 2"
                        />
                        {side === 'top' ? (
                          <line x1="1" y1="1" x2="11" y2="1" stroke="currentColor" />
                        ) : side === 'right' ? (
                          <line x1="11" y1="1" x2="11" y2="11" stroke="currentColor" />
                        ) : side === 'bottom' ? (
                          <line x1="1" y1="11" x2="11" y2="11" stroke="currentColor" />
                        ) : (
                          <line x1="1" y1="1" x2="1" y2="11" stroke="currentColor" />
                        )}
                      </svg>
                    }
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </PropertyListRoot>
    </TipProvider>
  )
}
