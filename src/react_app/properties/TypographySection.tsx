import * as ToggleGroup from '@radix-ui/react-toggle-group'
import {
  ALargeSmall,
  AlertTriangle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Italic,
  Strikethrough,
  Underline
} from 'lucide-react'

import { loadFont } from '@/engine/fonts'
import { FontPicker } from '@/react_app/pickers/FontPicker'
import { ScrubInput } from '@/react_app/pickers/ScrubInput'
import { AppSelect } from '@/react_app/ui/AppSelect'
import { sectionWrapper } from '@/react_app/ui/section'
import { Tip, TipProvider } from '@/react_app/ui/Tip'
import { TypographyControlsRoot, useI18n } from '@open-pencil/react'

const toggleItemClass =
  'flex cursor-pointer items-center justify-center rounded border border-border bg-input px-2 py-1 text-muted hover:bg-hover hover:text-surface data-[state=on]:border-accent data-[state=on]:bg-accent data-[state=on]:text-white'

export function TypographySection() {
  const { panels } = useI18n()

  return (
    <TipProvider>
      <TypographyControlsRoot loadFont={loadFont}>
        {(ctx) =>
          ctx.node ? (
            <div data-test-id="typography-section" className={sectionWrapper()}>
              <label className="mb-1.5 block text-[11px] text-muted">{panels.typography}</label>

              <div className="mb-1.5 flex items-center gap-1.5">
                <FontPicker
                  className="min-w-0 flex-1"
                  value={ctx.node.fontFamily}
                  onSelect={(f) => void ctx.setFamily(f)}
                />
                {ctx.hasMissingFonts ? (
                  <Tip
                    label={
                      'Missing font' +
                      (ctx.missingFonts.length > 1 ? 's' : '') +
                      ': ' +
                      ctx.missingFonts.join(', ')
                    }
                  >
                    <AlertTriangle
                      data-test-id="typography-missing-font"
                      className="size-3.5 shrink-0 text-amber-400"
                    />
                  </Tip>
                ) : null}
              </div>

              <div className="mb-1.5 flex gap-1.5">
                <AppSelect
                  value={ctx.node.fontWeight}
                  options={ctx.weights}
                  onValueChange={(v) => void ctx.setWeight(+v)}
                />
                <ScrubInput
                  className="flex-1"
                  value={ctx.node.fontSize}
                  min={1}
                  max={1000}
                  onValueChange={(v) => ctx.updateProp('fontSize', v)}
                  onCommit={(v, p) => ctx.commitProp('fontSize', v, p)}
                />
              </div>

              <div className="mb-1.5 flex gap-1.5">
                <ScrubInput
                  className="flex-1"
                  value={ctx.node.lineHeight ?? Math.round((ctx.node.fontSize || 14) * 1.2)}
                  min={0}
                  onValueChange={(v) => ctx.updateProp('lineHeight', v)}
                  onCommit={(v, p) => ctx.commitProp('lineHeight', v, p)}
                  iconSlot={<Baseline className="size-3" />}
                />
                <ScrubInput
                  className="flex-1"
                  suffix="%"
                  value={ctx.node.letterSpacing}
                  onValueChange={(v) => ctx.updateProp('letterSpacing', v)}
                  onCommit={(v, p) => ctx.commitProp('letterSpacing', v, p)}
                  iconSlot={<ALargeSmall className="size-3" />}
                />
              </div>

              <div className="mb-1.5">
                <label className="mb-1 block text-[11px] text-muted">{panels.direction}</label>
                <AppSelect
                  value={ctx.node.textDirection}
                  options={[
                    { value: 'AUTO', label: panels.auto },
                    { value: 'LTR', label: 'LTR' },
                    { value: 'RTL', label: 'RTL' }
                  ]}
                  onValueChange={ctx.setDirection}
                />
              </div>

              <div className="flex items-center gap-3">
                <ToggleGroup.Root
                  type="single"
                  className="flex gap-0.5"
                  value={ctx.node.textAlignHorizontal}
                  onValueChange={(v) => ctx.onAlignChange(v || null)}
                >
                  {(
                    [
                      { value: 'LEFT', Icon: AlignLeft },
                      { value: 'CENTER', Icon: AlignCenter },
                      { value: 'RIGHT', Icon: AlignRight }
                    ] as const
                  ).map((align) => (
                    <ToggleGroup.Item
                      key={align.value}
                      value={align.value}
                      className={toggleItemClass}
                    >
                      <align.Icon className="size-3.5" />
                    </ToggleGroup.Item>
                  ))}
                </ToggleGroup.Root>
                <ToggleGroup.Root
                  type="multiple"
                  className="flex gap-0.5"
                  value={ctx.activeFormatting}
                  onValueChange={ctx.onFormattingChange}
                >
                  <Tip label="Bold (⌘B)">
                    <ToggleGroup.Item
                      value="bold"
                      data-test-id="typography-bold-button"
                      className={`${toggleItemClass} font-bold`}
                    >
                      <Bold className="size-3.5" />
                    </ToggleGroup.Item>
                  </Tip>
                  <Tip label="Italic (⌘I)">
                    <ToggleGroup.Item value="italic" className={toggleItemClass}>
                      <Italic className="size-3.5" />
                    </ToggleGroup.Item>
                  </Tip>
                  <Tip label="Underline (⌘U)">
                    <ToggleGroup.Item value="underline" className={toggleItemClass}>
                      <Underline className="size-3.5" />
                    </ToggleGroup.Item>
                  </Tip>
                  <Tip label="Strikethrough">
                    <ToggleGroup.Item value="strikethrough" className={toggleItemClass}>
                      <Strikethrough className="size-3.5" />
                    </ToggleGroup.Item>
                  </Tip>
                </ToggleGroup.Root>
              </div>
            </div>
          ) : null
        }
      </TypographyControlsRoot>
    </TipProvider>
  )
}
