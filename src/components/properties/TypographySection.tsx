import IconAlertTriangle from '~icons/lucide/alert-triangle'
import IconAlignLeft from '~icons/lucide/align-left'
import IconAlignCenter from '~icons/lucide/align-center'
import IconAlignRight from '~icons/lucide/align-right'
import IconBold from '~icons/lucide/bold'
import IconItalic from '~icons/lucide/italic'
import IconUnderline from '~icons/lucide/underline'
import IconStrikethrough from '~icons/lucide/strikethrough'
import IconBaseline from '~icons/lucide/baseline'
import IconALargeSmall from '~icons/lucide/a-large-small'

import { TypographyControlsRoot, useI18n } from '@open-pencil/react'
import { AppSelect } from '@/components/ui/AppSelect'
import { IconButton } from '@/components/ui/IconButton'
import { PanelRow } from '@/components/ui/panel/PanelRow'
import { PanelSection } from '@/components/ui/panel/PanelSection'
import { Tip } from '@/components/ui/Tip'
import { VariableNumberField } from '@/components/properties/VariableNumberField'
import { FontPicker } from '@/components/font-picker/FontPicker'
import { FontSettingsPopover } from '@/components/FontSettings/FontSettingsPopover'
import { loadFont } from '@/app/editor/fonts'
import { appMenuShortcutLabel } from '@/app/shell/menu/shortcut'

const fontLoader = { load: loadFont }

export function TypographySection() {
  const { panels, menu } = useI18n()

  return (
    <TypographyControlsRoot fontLoader={fontLoader}>
      {(ctx) => {
        if (!ctx.node) return null

        return (
          <PanelSection label={panels.typography} data-test-id="typography-section">
            <PanelRow className="mb-1.5">
              <FontPicker
                className="min-w-0 flex-1"
                value={ctx.node.fontFamily}
                onSelect={ctx.actions.setFamily}
              />
              <FontSettingsPopover />
              {ctx.hasMissingFonts && (
                <Tip
                  label={
                    'Missing font' +
                    (ctx.missingFonts.length > 1 ? 's' : '') +
                    ': ' +
                    ctx.missingFonts.join(', ')
                  }
                >
                  <IconAlertTriangle
                    data-test-id="typography-missing-font"
                    className="size-3.5 shrink-0 text-[var(--color-warning-action)]"
                  />
                </Tip>
              )}
            </PanelRow>

            <PanelRow cols="two" className="mb-1.5">
              <AppSelect
                value={String(ctx.node.fontWeight)}
                options={ctx.weights.map((w) => ({ value: String(w.value), label: w.label }))}
                onChange={(v) => ctx.actions.setWeight(Number(v))}
              />
              <VariableNumberField
                className="flex-1"
                value={ctx.node.fontSize}
                min={1}
                max={1000}
                nodeId={ctx.node.id}
                bindingPath="fontSize"
                onChange={(v) => ctx.actions.updateProp('fontSize', v)}
                onCommit={(v, p) => ctx.actions.commitProp('fontSize', v, p)}
              />
            </PanelRow>

            <PanelRow cols="two" className="mb-1.5">
              <VariableNumberField
                className="flex-1"
                value={ctx.node.lineHeight ?? Math.round((ctx.node.fontSize || 14) * 1.2)}
                min={0}
                nodeId={ctx.node.id}
                bindingPath="lineHeight"
                iconSlot={<IconBaseline className="size-3" />}
                onChange={(v) => ctx.actions.updateProp('lineHeight', v)}
                onCommit={(v, p) => ctx.actions.commitProp('lineHeight', v, p)}
              />
              <VariableNumberField
                className="flex-1"
                suffix="%"
                value={ctx.node.letterSpacing}
                nodeId={ctx.node.id}
                bindingPath="letterSpacing"
                iconSlot={<IconALargeSmall className="size-3" />}
                onChange={(v) => ctx.actions.updateProp('letterSpacing', v)}
                onCommit={(v, p) => ctx.actions.commitProp('letterSpacing', v, p)}
              />
            </PanelRow>

            <div className="mb-1.5">
              <label className="mb-1 block text-[11px] text-muted">{panels.direction}</label>
              <AppSelect
                value={ctx.node.textDirection}
                options={[
                  { value: 'AUTO', label: panels.auto },
                  { value: 'LTR', label: 'LTR' },
                  { value: 'RTL', label: 'RTL' }
                ]}
                onChange={(v) => ctx.actions.setDirection(v as 'AUTO' | 'LTR' | 'RTL')}
              />
            </div>

            <PanelRow className="gap-3">
              <PanelRow gap="sm">
                <IconButton
                  label={panels.alignLeft}
                  size="md"
                  active={ctx.node.textAlignHorizontal === 'LEFT'}
                  onClick={() => ctx.actions.align('LEFT')}
                >
                  <IconAlignLeft className="size-3.5" />
                </IconButton>
                <IconButton
                  label={panels.alignCenterHorizontally}
                  size="md"
                  active={ctx.node.textAlignHorizontal === 'CENTER'}
                  onClick={() => ctx.actions.align('CENTER')}
                >
                  <IconAlignCenter className="size-3.5" />
                </IconButton>
                <IconButton
                  label={panels.alignRight}
                  size="md"
                  active={ctx.node.textAlignHorizontal === 'RIGHT'}
                  onClick={() => ctx.actions.align('RIGHT')}
                >
                  <IconAlignRight className="size-3.5" />
                </IconButton>
              </PanelRow>
              <PanelRow gap="sm">
                <IconButton
                  label={`${menu.bold} (${appMenuShortcutLabel('text.bold')})`}
                  size="md"
                  active={ctx.activeFormatting.includes('bold')}
                  data-test-id="typography-bold-button"
                  onClick={ctx.actions.toggleBold}
                >
                  <IconBold className="size-3.5" />
                </IconButton>
                <IconButton
                  label={`${menu.italic} (${appMenuShortcutLabel('text.italic')})`}
                  size="md"
                  active={ctx.activeFormatting.includes('italic')}
                  onClick={ctx.actions.toggleItalic}
                >
                  <IconItalic className="size-3.5" />
                </IconButton>
                <IconButton
                  label={`${menu.underline} (${appMenuShortcutLabel('text.underline')})`}
                  size="md"
                  active={ctx.activeFormatting.includes('underline')}
                  onClick={() => ctx.actions.toggleDecoration('UNDERLINE')}
                >
                  <IconUnderline className="size-3.5" />
                </IconButton>
                <IconButton
                  label={menu.strikethrough}
                  size="md"
                  active={ctx.activeFormatting.includes('strikethrough')}
                  onClick={() => ctx.actions.toggleDecoration('STRIKETHROUGH')}
                >
                  <IconStrikethrough className="size-3.5" />
                </IconButton>
              </PanelRow>
            </PanelRow>
          </PanelSection>
        )
      }}
    </TypographyControlsRoot>
  )
}
