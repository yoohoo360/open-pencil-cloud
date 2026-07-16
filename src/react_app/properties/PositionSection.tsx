import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  FlipHorizontal2,
  FlipVertical2,
  RotateCw,
  RotateCwSquare
} from 'lucide-react'

import { ScrubInput } from '@/react_app/pickers/ScrubInput'
import { iconButton } from '@/react_app/ui/iconButton'
import { sectionWrapper } from '@/react_app/ui/section'
import { Tip, TipProvider } from '@/react_app/ui/Tip'
import { PositionControlsRoot, useEditor, useI18n } from '@open-pencil/react'

import type { Editor } from '@open-pencil/core/editor'

type AppEditor = Editor & {
  state: Editor['state'] & {
    nodeEditState?: { selectedVertexIndices: Set<number> } | null
  }
  nodeEditAlignVertices: (axis: 'horizontal' | 'vertical', pos: 'min' | 'center' | 'max') => void
}

export function PositionSection() {
  const { panels } = useI18n()
  const store = useEditor() as AppEditor

  function handleAlign(
    nodeAlign: (axis: 'horizontal' | 'vertical', pos: 'min' | 'center' | 'max') => void,
    axis: 'horizontal' | 'vertical',
    pos: 'min' | 'center' | 'max'
  ) {
    const es = store.state.nodeEditState
    if (es && es.selectedVertexIndices.size >= 2) {
      store.nodeEditAlignVertices(axis, pos)
    } else {
      nodeAlign(axis, pos)
    }
  }

  return (
    <TipProvider>
      <PositionControlsRoot>
        {({
          active,
          isMulti,
          xValue,
          yValue,
          wValue,
          hValue,
          rotationValue,
          updateProp,
          commitProp,
          align,
          flip,
          rotate
        }) =>
          active ? (
            <div data-test-id="position-section" className={sectionWrapper()}>
              <label className="mb-1.5 block text-[11px] text-muted">{panels.position}</label>

              <div className="mb-1.5 flex gap-2">
                <div className="flex gap-0.5">
                  <Tip label={panels.alignLeft}>
                    <button
                      type="button"
                      className={iconButton({ size: 'md' })}
                      data-test-id="position-align-left"
                      onClick={() => handleAlign(align, 'horizontal', 'min')}
                    >
                      <AlignStartVertical className="size-3.5" />
                    </button>
                  </Tip>
                  <Tip label={panels.alignCenterHorizontally}>
                    <button
                      type="button"
                      className={iconButton({ size: 'md' })}
                      data-test-id="position-align-center-h"
                      onClick={() => handleAlign(align, 'horizontal', 'center')}
                    >
                      <AlignCenterVertical className="size-3.5" />
                    </button>
                  </Tip>
                  <Tip label={panels.alignRight}>
                    <button
                      type="button"
                      className={iconButton({ size: 'md' })}
                      data-test-id="position-align-right"
                      onClick={() => handleAlign(align, 'horizontal', 'max')}
                    >
                      <AlignEndVertical className="size-3.5" />
                    </button>
                  </Tip>
                </div>
                <div className="flex gap-0.5">
                  <Tip label={panels.alignTop}>
                    <button
                      type="button"
                      className={iconButton({ size: 'md' })}
                      data-test-id="position-align-top"
                      onClick={() => handleAlign(align, 'vertical', 'min')}
                    >
                      <AlignStartHorizontal className="size-3.5" />
                    </button>
                  </Tip>
                  <Tip label={panels.alignCenterVertically}>
                    <button
                      type="button"
                      className={iconButton({ size: 'md' })}
                      data-test-id="position-align-center-v"
                      onClick={() => handleAlign(align, 'vertical', 'center')}
                    >
                      <AlignCenterHorizontal className="size-3.5" />
                    </button>
                  </Tip>
                  <Tip label={panels.alignBottom}>
                    <button
                      type="button"
                      className={iconButton({ size: 'md' })}
                      data-test-id="position-align-bottom"
                      onClick={() => handleAlign(align, 'vertical', 'max')}
                    >
                      <AlignEndHorizontal className="size-3.5" />
                    </button>
                  </Tip>
                </div>
              </div>

              <div className="flex gap-1.5">
                <ScrubInput
                  icon="X"
                  value={xValue}
                  onValueChange={(v) => updateProp('x', v)}
                  onCommit={(v, p) => commitProp('x', v, p)}
                />
                <ScrubInput
                  icon="Y"
                  value={yValue}
                  onValueChange={(v) => updateProp('y', v)}
                  onCommit={(v, p) => commitProp('y', v, p)}
                />
              </div>

              {isMulti ? (
                <div className="mt-1.5 flex gap-1.5">
                  <ScrubInput
                    icon="W"
                    value={wValue}
                    min={1}
                    onValueChange={(v) => updateProp('width', v)}
                    onCommit={(v, p) => commitProp('width', v, p)}
                  />
                  <ScrubInput
                    icon="H"
                    value={hValue}
                    min={1}
                    onValueChange={(v) => updateProp('height', v)}
                    onCommit={(v, p) => commitProp('height', v, p)}
                  />
                </div>
              ) : null}

              <div className="mt-1.5 flex items-center gap-1.5">
                <ScrubInput
                  className="flex-1"
                  suffix="°"
                  value={rotationValue}
                  min={-360}
                  max={360}
                  onValueChange={(v) => updateProp('rotation', v)}
                  onCommit={(v, p) => commitProp('rotation', v, p)}
                  iconSlot={<RotateCw className="size-3" />}
                />
                <Tip label={panels.flipHorizontal}>
                  <button
                    type="button"
                    className={iconButton({ size: 'md', className: 'shrink-0' })}
                    data-test-id="position-flip-horizontal"
                    onClick={() => flip('horizontal')}
                  >
                    <FlipHorizontal2 className="size-3.5" />
                  </button>
                </Tip>
                <Tip label={panels.flipVertical}>
                  <button
                    type="button"
                    className={iconButton({ size: 'md', className: 'shrink-0' })}
                    data-test-id="position-flip-vertical"
                    onClick={() => flip('vertical')}
                  >
                    <FlipVertical2 className="size-3.5" />
                  </button>
                </Tip>
                <Tip label={panels.rotate90}>
                  <button
                    type="button"
                    className={iconButton({ size: 'md', className: 'shrink-0' })}
                    data-test-id="position-rotate-90"
                    onClick={() => rotate(90)}
                  >
                    <RotateCwSquare className="size-3.5" />
                  </button>
                </Tip>
              </div>
            </div>
          ) : null
        }
      </PositionControlsRoot>
    </TipProvider>
  )
}
