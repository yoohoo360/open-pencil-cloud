import { colorToHexRaw, parseColor } from '@open-pencil/core/color'

import IconPlus from '~icons/lucide/plus'

import { useFillControls, useOkHCL, useI18n } from '@open-pencil/react'

import { FillPicker } from '@/components/fill-picker/FillPicker'
import { PropertyListRoot } from '@/components/properties/PropertyListRoot'
import { IconButton } from '@/components/ui/IconButton'
import { PanelSection } from '@/components/ui/panel/PanelSection'
import { ColorStyleRow } from '@/components/properties/ColorStyleRow'
import { boundVariableSwatchBackground, displayFillWithBoundVariable } from '@/components/properties/color-style-row'
import { fillLabel } from '@/components/properties/fill-label'
import { createFillOkhclAdapter } from '@/components/properties/fill-okhcl'

import type { Fill, SceneNode } from '@open-pencil/scene-graph'

export function FillSection() {
  const fillCtx = useFillControls()
  const okhcl = useOkHCL()
  const { panels } = useI18n()

  function updateFill(
    activeNode: SceneNode | null | undefined,
    index: number,
    fill: Fill,
    update: (index: number, fill: Fill) => void
  ) {
    if (activeNode && fillCtx.getBoundVariable(activeNode.id, index)) {
      fillCtx.unbindVariable(activeNode.id, index)
    }
    update(index, fill)
  }

  function updateFillHex(
    activeNode: SceneNode | null | undefined,
    index: number,
    fill: Fill,
    hex: string,
    update: (index: number, fill: Fill) => void
  ) {
    if (fill.type !== 'SOLID') return
    const parsed = parseColor(hex.startsWith('#') ? hex : `#${hex}`)
    if (!parsed) return
    updateFill(activeNode, index, { ...fill, color: { ...parsed, a: fill.color.a } }, update)
  }

  return (
    <PropertyListRoot propKey="fills" label={panels.fill}>
      {({ items, isMixed, activeNode, actions }) => (
        <PanelSection
          label={panels.fill}
          data-test-id="fill-section"
          actions={
            <IconButton
              label={panels.addFill}
              data-test-id="fill-section-add"
              onClick={() => actions.add({ ...fillCtx.defaultFill })}
            >
              <IconPlus className="size-3.5" />
            </IconButton>
          }
        >
          {isMixed && (
            <p className="text-[11px] text-muted">{panels.mixedFillsHelp}</p>
          )}
          {items.map((fill, i) => (
            <ColorStyleRow
              key={`${i}:${fill.visible ? 'visible' : 'hidden'}`}
              item={fill}
              index={i}
              activeNodeId={activeNode?.id ?? null}
              bindingApi={fillCtx}
              variableColor={fill.type === 'SOLID' ? fill.color : undefined}
              data-test-id="fill-item"
              data-test-index={i}
              removeLabel={panels.removeFill}
              onPatch={(changes) => actions.patch(i, changes)}
              onToggleVisibility={() => actions.toggleVisibility(i)}
              onRemove={() => actions.remove(i)}
            >
              <FillPicker
                fill={activeNode ? displayFillWithBoundVariable(fillCtx, activeNode.id, i, fill) : fill}
                okhcl={createFillOkhclAdapter(okhcl, activeNode, i)}
                swatchBackground={
                  activeNode ? boundVariableSwatchBackground(fillCtx, activeNode.id, i) : undefined
                }
                onUpdate={(updated) => updateFill(activeNode, i, updated, actions.update)}
              />

              {fill.type === 'SOLID' && !(activeNode && fillCtx.getBoundVariable(activeNode.id, i)) ? (
                <input
                  data-test-id="fill-hex-input"
                  className="min-w-0 flex-1 border-none bg-transparent font-mono text-xs text-surface outline-none"
                  value={colorToHexRaw(fill.color)}
                  maxLength={6}
                  onChange={(e) => updateFillHex(activeNode, i, fill, e.target.value, actions.update)}
                />
              ) : (
                <span
                  className={`min-w-0 flex-1 truncate font-mono text-xs ${
                    activeNode && fillCtx.getBoundVariable(activeNode.id, i)
                      ? 'rounded bg-violet-500/10 px-1 text-violet-400'
                      : 'text-surface'
                  }`}
                >
                  {fillLabel(fill, activeNode ? fillCtx.getBoundVariable(activeNode.id, i) : undefined)}
                </span>
              )}
            </ColorStyleRow>
          ))}
        </PanelSection>
      )}
    </PropertyListRoot>
  )
}
