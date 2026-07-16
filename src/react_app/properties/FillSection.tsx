import { FillPicker } from '@/react_app/pickers/FillPicker'
import { ColorStyleRow } from '@/react_app/properties/ColorStyleRow'
import { iconButton } from '@/react_app/ui/iconButton'
import { sectionLabel, sectionWrapper } from '@/react_app/ui/section'
import { colorToHexRaw } from '@open-pencil/core'
import { PropertyListRoot, useFillControls, useI18n, useOkHCL } from '@open-pencil/react'

import type { Fill } from '@open-pencil/core'

export function FillSection() {
  const fillCtx = useFillControls()
  const okhcl = useOkHCL()
  const { panels } = useI18n()

  return (
    <PropertyListRoot propKey="fills" label={panels.fill}>
      {({ items, isMixed, activeNode, add, remove, update, patch, toggleVisibility }) => (
        <div data-test-id="fill-section" className={sectionWrapper()}>
          <div className="flex items-center justify-between">
            <label className={sectionLabel()}>{panels.fill}</label>
            <button
              type="button"
              data-test-id="fill-section-add"
              className={iconButton()}
              onClick={() => add({ ...fillCtx.defaultFill })}
            >
              +
            </button>
          </div>
          {isMixed ? <p className="text-[11px] text-muted">{panels.mixedFillsHelp}</p> : null}
          {(items as Fill[]).map((fill, i) => (
            <ColorStyleRow
              key={`${i}:${fill.visible ? 'visible' : 'hidden'}`}
              item={fill}
              index={i}
              activeNodeId={activeNode?.id ?? null}
              bindingApi={fillCtx}
              visibilityTestId={`fill-visibility-${i}`}
              unbindTestId="fill-unbind-variable"
              data-test-id="fill-item"
              data-test-index={i}
              onPatch={(changes) => patch(i, changes)}
              onToggleVisibility={() => toggleVisibility(i)}
              onRemove={() => remove(i)}
            >
              <FillPicker
                fill={fill}
                okhcl={
                  activeNode
                    ? {
                        fieldFormat: okhcl.getFieldFormat(activeNode, i, 'fill'),
                        fieldOptions: okhcl.fieldOptions,
                        okhcl: okhcl.getFillOkHCLColor(activeNode, i),
                        ...okhcl.getFillPreviewInfo(activeNode, i),
                        setFieldFormat: (event) => okhcl.setFillFieldFormat(activeNode, i, event),
                        updateOkHCL: (event) => okhcl.updateFillOkHCL(activeNode, i, event)
                      }
                    : null
                }
                onUpdate={(f) => update(i, f)}
              />

              {activeNode && fillCtx.getBoundVariable(activeNode.id, i) ? (
                <span className="min-w-0 flex-1 truncate rounded bg-violet-500/10 px-1 font-mono text-xs text-violet-400">
                  {fillCtx.getBoundVariable(activeNode.id, i)!.name}
                </span>
              ) : (
                <span className="min-w-0 flex-1 font-mono text-xs text-surface">
                  {fill.type === 'SOLID'
                    ? colorToHexRaw(fill.color)
                    : fill.type.startsWith('GRADIENT')
                      ? fill.type.replace('GRADIENT_', '')
                      : fill.type}
                </span>
              )}
            </ColorStyleRow>
          ))}
        </div>
      )}
    </PropertyListRoot>
  )
}
