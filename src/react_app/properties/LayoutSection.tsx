import { ArrowDown, ArrowRight, LayoutGrid, Minus, Plus, WrapText } from 'lucide-react'

import { ScrubInput } from '@/react_app/pickers/ScrubInput'
import { AppSelect } from '@/react_app/ui/AppSelect'
import { sectionWrapper } from '@/react_app/ui/section'
import { Tip, TipProvider } from '@/react_app/ui/Tip'
import { LayoutControlsRoot, useI18n } from '@open-pencil/react'

export function LayoutSection() {
  const { panels } = useI18n()

  return (
    <TipProvider>
      <LayoutControlsRoot>
        {(ctx) =>
          ctx.node ? (
            <>
              <div data-test-id="layout-section" className={sectionWrapper()}>
                <label className="mb-1.5 block text-[11px] text-muted">{panels.layout}</label>
                <div className="flex gap-1.5">
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <ScrubInput
                      icon="W"
                      value={Math.round(ctx.node.width)}
                      min={0}
                      onValueChange={(v) => ctx.updateProp('width', v)}
                      onCommit={(v, p) => ctx.commitProp('width', v, p)}
                    />
                    {ctx.isFlex || ctx.isInAutoLayout ? (
                      <AppSelect
                        value={ctx.widthSizing}
                        options={ctx.widthSizingOptions}
                        onValueChange={ctx.setWidthSizing}
                      />
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <ScrubInput
                      icon="H"
                      value={Math.round(ctx.node.height)}
                      min={0}
                      onValueChange={(v) => ctx.updateProp('height', v)}
                      onCommit={(v, p) => ctx.commitProp('height', v, p)}
                    />
                    {ctx.isFlex || ctx.isInAutoLayout ? (
                      <AppSelect
                        value={ctx.heightSizing}
                        options={ctx.heightSizingOptions}
                        onValueChange={ctx.setHeightSizing}
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              {ctx.node.type === 'FRAME' ? (
                <>
                  <div className={sectionWrapper()}>
                    <div className="flex items-center justify-between">
                      <label className="mb-1.5 block text-[11px] text-muted">
                        {panels.autoLayout}
                      </label>
                      {ctx.node.layoutMode === 'NONE' ? (
                        <Tip label={panels.addAutoLayout}>
                          <button
                            type="button"
                            className="cursor-pointer rounded border-none bg-transparent px-1 text-base leading-none text-muted hover:bg-hover hover:text-surface"
                            data-test-id="layout-add-auto"
                            onClick={() => ctx.editor.setLayoutMode(ctx.node!.id, 'VERTICAL')}
                          >
                            +
                          </button>
                        </Tip>
                      ) : (
                        <Tip label={panels.removeAutoLayout}>
                          <button
                            type="button"
                            className="cursor-pointer rounded border-none bg-transparent px-1 text-base leading-none text-muted hover:bg-hover hover:text-surface"
                            data-test-id="layout-remove-auto"
                            onClick={() => ctx.editor.setLayoutMode(ctx.node!.id, 'NONE')}
                          >
                            −
                          </button>
                        </Tip>
                      )}
                    </div>

                    {ctx.node.layoutMode !== 'NONE' ? (
                      <>
                        <div className="mt-1.5 flex gap-0.5">
                          {(
                            [
                              { mode: 'HORIZONTAL' as const, Icon: ArrowRight, test: 'horizontal' },
                              { mode: 'VERTICAL' as const, Icon: ArrowDown, test: 'vertical' },
                              { mode: 'GRID' as const, Icon: LayoutGrid, test: 'grid' }
                            ] as const
                          ).map((dir) => (
                            <button
                              key={dir.mode}
                              type="button"
                              data-test-id={`layout-direction-${dir.test}`}
                              className={`flex cursor-pointer items-center justify-center rounded border px-2 py-1 ${
                                (
                                  dir.mode === 'GRID'
                                    ? ctx.isGrid
                                    : ctx.node!.layoutMode === dir.mode
                                )
                                  ? 'border-accent bg-accent/10 text-accent'
                                  : 'border-border text-muted hover:bg-hover hover:text-surface'
                              }`}
                              onClick={() => ctx.editor.setLayoutMode(ctx.node!.id, dir.mode)}
                            >
                              <dir.Icon className="size-3.5" />
                            </button>
                          ))}
                          {ctx.isFlex ? (
                            <button
                              type="button"
                              data-test-id="layout-direction-wrap"
                              className={`flex cursor-pointer items-center justify-center rounded border px-2 py-1 ${
                                ctx.node.layoutWrap === 'WRAP'
                                  ? 'border-accent bg-accent/10 text-accent'
                                  : 'border-border text-muted hover:bg-hover hover:text-surface'
                              }`}
                              onClick={() =>
                                ctx.updateProp(
                                  'layoutWrap',
                                  ctx.node!.layoutWrap === 'WRAP' ? 'NO_WRAP' : 'WRAP'
                                )
                              }
                            >
                              <WrapText className="size-3.5" />
                            </button>
                          ) : null}
                        </div>

                        {ctx.isFlex ? (
                          <div className="mt-2">
                            <label className="mb-1 block text-[11px] text-muted">
                              {panels.flow}
                            </label>
                            <AppSelect
                              value={ctx.layoutDirection}
                              options={[
                                { value: 'AUTO', label: panels.auto },
                                { value: 'LTR', label: 'LTR' },
                                { value: 'RTL', label: 'RTL' }
                              ]}
                              onValueChange={ctx.setLayoutDirection}
                            />
                          </div>
                        ) : null}

                        {ctx.isGrid
                          ? (['gridTemplateColumns', 'gridTemplateRows'] as const).map(
                              (trackProp) => (
                                <div key={trackProp} className="mt-2">
                                  <div className="mb-1 flex items-center justify-between">
                                    <label className="text-[11px] text-muted">
                                      {trackProp === 'gridTemplateColumns'
                                        ? panels.columns
                                        : panels.rows}
                                    </label>
                                    <button
                                      type="button"
                                      className="cursor-pointer rounded border-none bg-transparent px-1 text-xs leading-none text-muted hover:bg-hover hover:text-surface"
                                      onClick={() => ctx.addTrack(trackProp)}
                                    >
                                      +
                                    </button>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    {ctx.node![trackProp].map((track, i) => (
                                      <div key={i} className="flex items-center gap-1">
                                        {track.sizing !== 'AUTO' ? (
                                          <ScrubInput
                                            className="flex-1"
                                            icon={`${trackProp === 'gridTemplateColumns' ? 'C' : 'R'}${i + 1}`}
                                            value={track.value}
                                            min={track.sizing === 'FR' ? 1 : 0}
                                            suffix={track.sizing === 'FR' ? 'fr' : 'px'}
                                            onValueChange={(v) =>
                                              ctx.updateGridTrack(trackProp, i, { value: v })
                                            }
                                          />
                                        ) : (
                                          <span className="flex-1 px-1 text-xs text-muted">
                                            {ctx.trackLabel(track)}
                                          </span>
                                        )}
                                        <AppSelect
                                          value={track.sizing}
                                          options={ctx.trackSizingOptions}
                                          onValueChange={(sizing) =>
                                            ctx.updateGridTrack(trackProp, i, {
                                              sizing,
                                              value:
                                                sizing === 'FR' ? 1 : sizing === 'FIXED' ? 100 : 0
                                            })
                                          }
                                        />
                                        {ctx.node![trackProp].length > 1 ? (
                                          <button
                                            type="button"
                                            className="cursor-pointer rounded border-none bg-transparent px-0.5 text-xs text-muted hover:text-surface"
                                            onClick={() => ctx.removeTrack(trackProp, i)}
                                          >
                                            ×
                                          </button>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            )
                          : null}

                        {ctx.isGrid ? (
                          <div className="mt-2 grid grid-cols-2 gap-1.5">
                            <ScrubInput
                              icon="↔"
                              value={Math.round(ctx.node.gridColumnGap)}
                              min={0}
                              onValueChange={(v) => ctx.updateProp('gridColumnGap', v)}
                              onCommit={(v, p) => ctx.commitProp('gridColumnGap', v, p)}
                            />
                            <ScrubInput
                              icon="↕"
                              value={Math.round(ctx.node.gridRowGap)}
                              min={0}
                              onValueChange={(v) => ctx.updateProp('gridRowGap', v)}
                              onCommit={(v, p) => ctx.commitProp('gridRowGap', v, p)}
                            />
                          </div>
                        ) : null}

                        {ctx.isFlex ? (
                          <div className="mt-2 flex items-center gap-1.5">
                            <ScrubInput
                              data-test-id="layout-gap-input"
                              className="flex-1"
                              icon={ctx.node.layoutMode === 'VERTICAL' ? '↕' : '↔'}
                              value={Math.round(ctx.node.itemSpacing)}
                              min={0}
                              onValueChange={(v) => ctx.updateProp('itemSpacing', v)}
                              onCommit={(v, p) => ctx.commitProp('itemSpacing', v, p)}
                            />
                            <button
                              type="button"
                              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded border border-border bg-transparent text-muted hover:bg-hover hover:text-surface"
                              onClick={ctx.toggleIndividualPadding}
                            >
                              {ctx.showIndividualPadding || !ctx.hasUniformPadding ? (
                                <Minus className="size-3" />
                              ) : (
                                <Plus className="size-3" />
                              )}
                            </button>
                          </div>
                        ) : null}

                        {ctx.isFlex && !ctx.showIndividualPadding && ctx.hasUniformPadding ? (
                          <div className="mt-1.5">
                            <ScrubInput
                              data-test-id="layout-uniform-padding-input"
                              icon="☐"
                              value={Math.round(ctx.node.paddingTop)}
                              min={0}
                              onValueChange={ctx.setUniformPadding}
                              onCommit={ctx.commitUniformPadding}
                            />
                          </div>
                        ) : null}

                        {ctx.isGrid ||
                        (ctx.isFlex && (ctx.showIndividualPadding || !ctx.hasUniformPadding)) ? (
                          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                            {(
                              [
                                'paddingTop',
                                'paddingRight',
                                'paddingBottom',
                                'paddingLeft'
                              ] as const
                            ).map((side) => (
                              <ScrubInput
                                key={side}
                                icon={side[7]}
                                value={Math.round(ctx.node![side])}
                                min={0}
                                onValueChange={(v) => ctx.updateProp(side, v)}
                                onCommit={(v, p) => ctx.commitProp(side, v, p)}
                              />
                            ))}
                          </div>
                        ) : null}

                        {ctx.isFlex ? (
                          <div className="mt-2">
                            <label className="mb-1 block text-[11px] text-muted">
                              {panels.alignment}
                            </label>
                            <div
                              data-test-id="layout-alignment-grid"
                              className="grid w-fit grid-cols-3 gap-0.5"
                            >
                              {ctx.alignGrid.map((cell) => (
                                <button
                                  key={`${cell.primary}-${cell.counter}`}
                                  type="button"
                                  className={`flex size-6 cursor-pointer items-center justify-center rounded border text-[11px] ${
                                    ctx.node!.primaryAxisAlign === cell.primary &&
                                    ctx.node!.counterAxisAlign === cell.counter
                                      ? 'border-accent bg-accent/10 text-accent'
                                      : 'border-border text-muted hover:bg-hover hover:text-surface'
                                  }`}
                                  onClick={() => ctx.setAlignment(cell.primary, cell.counter)}
                                >
                                  <span className="size-1.5 rounded-full bg-current" />
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>

                  <div className={sectionWrapper()}>
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-surface">
                      <input
                        type="checkbox"
                        data-test-id="clip-content-checkbox"
                        className="accent-accent"
                        checked={ctx.node.clipsContent}
                        onChange={() =>
                          ctx.editor.updateNodeWithUndo(
                            ctx.node!.id,
                            { clipsContent: !ctx.node!.clipsContent },
                            'Toggle clip content'
                          )
                        }
                      />
                      {panels.clipContent}
                    </label>
                  </div>
                </>
              ) : null}
            </>
          ) : null
        }
      </LayoutControlsRoot>
    </TipProvider>
  )
}
