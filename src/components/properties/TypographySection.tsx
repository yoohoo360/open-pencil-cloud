import IconLucideALargeSmall from '~icons/lucide/a-large-small'
import IconLucideAlertTriangle from '~icons/lucide/alert-triangle'
import IconLucideAlignCenter from '~icons/lucide/align-center'
import IconLucideAlignJustify from '~icons/lucide/align-justify'
import IconLucideAlignLeft from '~icons/lucide/align-left'
import IconLucideAlignRight from '~icons/lucide/align-right'
import IconLucideAlignVerticalJustifyCenter from '~icons/lucide/align-vertical-justify-center'
import IconLucideAlignVerticalJustifyEnd from '~icons/lucide/align-vertical-justify-end'
import IconLucideAlignVerticalJustifyStart from '~icons/lucide/align-vertical-justify-start'
import IconLucideBaseline from '~icons/lucide/baseline'
import IconLucideBold from '~icons/lucide/bold'
import IconLucideItalic from '~icons/lucide/italic'
import IconLucideStrikethrough from '~icons/lucide/strikethrough'
import IconLucideUnderline from '~icons/lucide/underline'
import { TypographyControlsRoot, useI18n } from '@open-pencil/react'
import { memo, useMemo } from 'react'

import { loadFont } from '@/app/editor/fonts'
import { appMenuShortcutLabel } from '@/app/shell/menu/shortcut'
import FontPicker from '@/components/font-picker/FontPicker'
import FontSettingsPopover from '@/components/FontSettings/FontSettingsPopover'
import NumberField from '@/components/inputs/NumberField'
import SharedStyleField from '@/components/properties/shared-style/SharedStyleField'
import VariableNumberField from '@/components/properties/VariableNumberField'
import AppSelect from '@/components/ui/AppSelect'
import AppSwitch from '@/components/ui/AppSwitch'
import IconButton from '@/components/ui/IconButton'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup'
import PanelGrid from '@/components/ui/panel/PanelGrid'
import PanelSection from '@/components/ui/panel/PanelSection'
import SegmentedControl from '@/components/ui/SegmentedControl'
import Tip from '@/components/ui/Tip'

const fontLoader = { load: loadFont }

function featureEnabled(features: Array<{ tag: string; enabled: boolean }>, tag: string) {
  return features.find((feature) => feature.tag === tag)?.enabled ?? true
}

export const TypographySection = memo(function TypographySection() {
  const { panels, menu } = useI18n()

  const alignmentOptions = useMemo(
    () => [
      { value: 'LEFT', label: panels.alignLeft },
      { value: 'CENTER', label: panels.alignCenterHorizontally },
      { value: 'RIGHT', label: panels.alignRight },
      { value: 'JUSTIFIED', label: panels.textAlignment }
    ],
    [panels.alignCenterHorizontally, panels.alignLeft, panels.alignRight, panels.textAlignment]
  )

  const verticalAlignmentOptions = useMemo(
    () => [
      { value: 'TOP', label: panels.alignTop },
      { value: 'CENTER', label: panels.alignCenterVertically },
      { value: 'BOTTOM', label: panels.alignBottom }
    ],
    [panels.alignBottom, panels.alignCenterVertically, panels.alignTop]
  )

  const textCaseOptions = useMemo(
    () => [
      { value: 'ORIGINAL', label: panels.textCaseOriginal },
      { value: 'UPPER', label: panels.textCaseUpper },
      { value: 'LOWER', label: panels.textCaseLower },
      { value: 'TITLE', label: panels.textCaseTitle }
    ],
    [panels.textCaseLower, panels.textCaseOriginal, panels.textCaseTitle, panels.textCaseUpper]
  )

  const truncationOptions = useMemo(
    () => [
      { value: 'DISABLED', label: panels.truncationDisabled },
      { value: 'ENDING', label: panels.truncationEnding }
    ],
    [panels.truncationDisabled, panels.truncationEnding]
  )

  const commonFeatures = useMemo(
    () => [
      { tag: 'LIGA', label: panels.standardLigatures },
      { tag: 'CALT', label: panels.contextualAlternates },
      { tag: 'KERN', label: panels.kerning }
    ],
    [panels.contextualAlternates, panels.kerning, panels.standardLigatures]
  )

  return (
    <TypographyControlsRoot fontLoader={fontLoader}>
      {(ctx) =>
        ctx.node ? (
          <PanelSection label={panels.typography}>
            <SharedStyleField kind="text" label={panels.textStyle} />

            <div className="mb-1.5 flex min-w-0 items-center gap-1.5">
              <FontPicker
                className="min-w-0 flex-1"
                value={ctx.node.fontFamily}
                label={panels.fontFamily}
                onSelect={ctx.actions.setFamily}
                onValueChange={ctx.actions.setFamily}
              />
              <FontSettingsPopover />
              {ctx.hasMissingFonts ? (
                <Tip
                  label={`Missing font${ctx.missingFonts.length > 1 ? 's' : ''}: ${ctx.missingFonts.join(', ')}`}
                >
                  <IconLucideAlertTriangle
                    role="img"
                    aria-label={`Missing font${ctx.missingFonts.length > 1 ? 's' : ''}: ${ctx.missingFonts.join(', ')}`}
                    className="size-3.5 shrink-0 text-[var(--color-warning-action)]"
                  />
                </Tip>
              ) : null}
            </div>

            <PanelGrid columns="two" className="mb-3">
              <PanelFieldGroup label={panels.fontWeight}>
                <AppSelect
                  label={panels.fontWeight}
                  value={ctx.node.fontWeight}
                  options={ctx.weights}
                  onValueChange={(value) => ctx.actions.setWeight(Number(value))}
                />
              </PanelFieldGroup>
              <PanelFieldGroup label={panels.fontSize}>
                <VariableNumberField
                  value={ctx.node.fontSize}
                  aria-label={panels.fontSize}
                  min={1}
                  max={1000}
                  nodeId={ctx.node.id}
                  bindingPath="fontSize"
                  onValueChange={(value) => ctx.actions.updateProp('fontSize', value)}
                  onCommit={(value, previous) => ctx.actions.commitProp('fontSize', value, previous)}
                />
              </PanelFieldGroup>
            </PanelGrid>

            <PanelGrid columns="two" className="mb-3">
              <PanelFieldGroup label={panels.lineHeight}>
                <VariableNumberField
                  value={ctx.node.lineHeight ?? Math.round((ctx.node.fontSize || 14) * 1.2)}
                  aria-label={panels.lineHeight}
                  min={0}
                  nodeId={ctx.node.id}
                  bindingPath="lineHeight"
                  icon={<IconLucideBaseline className="size-3" />}
                  onValueChange={(value) => ctx.actions.updateProp('lineHeight', value)}
                  onCommit={(value, previous) => ctx.actions.commitProp('lineHeight', value, previous)}
                />
              </PanelFieldGroup>
              <PanelFieldGroup label={panels.letterSpacing}>
                <VariableNumberField
                  suffix="%"
                  value={ctx.node.letterSpacing}
                  aria-label={panels.letterSpacing}
                  nodeId={ctx.node.id}
                  bindingPath="letterSpacing"
                  icon={<IconLucideALargeSmall className="size-3" />}
                  onValueChange={(value) => ctx.actions.updateProp('letterSpacing', value)}
                  onCommit={(value, previous) =>
                    ctx.actions.commitProp('letterSpacing', value, previous)
                  }
                />
              </PanelFieldGroup>
            </PanelGrid>

            <PanelFieldGroup label={panels.direction} className="mb-3">
              <AppSelect
                label={panels.direction}
                value={ctx.node.textDirection}
                options={[
                  { value: 'AUTO', label: panels.auto },
                  { value: 'LTR', label: 'LTR' },
                  { value: 'RTL', label: 'RTL' }
                ]}
                onValueChange={(value) =>
                  ctx.actions.setDirection(value as 'AUTO' | 'LTR' | 'RTL')
                }
              />
            </PanelFieldGroup>

            <PanelFieldGroup label={panels.textAlignment} className="mb-3">
              <SegmentedControl
                value={ctx.node.textAlignHorizontal}
                options={alignmentOptions}
                label={panels.textAlignment}
                onValueChange={(value) =>
                  ctx.actions.align(value as 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED')
                }
                onChange={(value) =>
                  ctx.actions.align(value as 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED')
                }
                renderOption={({ option }) =>
                  option.value === 'LEFT' ? (
                    <IconLucideAlignLeft className="size-3.5" />
                  ) : option.value === 'CENTER' ? (
                    <IconLucideAlignCenter className="size-3.5" />
                  ) : option.value === 'RIGHT' ? (
                    <IconLucideAlignRight className="size-3.5" />
                  ) : (
                    <IconLucideAlignJustify className="size-3.5" />
                  )
                }
              />
            </PanelFieldGroup>

            <PanelFieldGroup label={panels.verticalTextAlignment} className="mb-3">
              <SegmentedControl
                value={ctx.node.textAlignVertical}
                options={verticalAlignmentOptions}
                label={panels.verticalTextAlignment}
                onValueChange={(value) =>
                  ctx.actions.setVerticalAlign(value as 'TOP' | 'CENTER' | 'BOTTOM')
                }
                onChange={(value) => ctx.actions.setVerticalAlign(value as 'TOP' | 'CENTER' | 'BOTTOM')}
                renderOption={({ option }) =>
                  option.value === 'TOP' ? (
                    <IconLucideAlignVerticalJustifyStart className="size-3.5" />
                  ) : option.value === 'CENTER' ? (
                    <IconLucideAlignVerticalJustifyCenter className="size-3.5" />
                  ) : (
                    <IconLucideAlignVerticalJustifyEnd className="size-3.5" />
                  )
                }
              />
            </PanelFieldGroup>

            <PanelFieldGroup label={panels.textFormatting} className="mb-3" ui={{ container: 'flex-row gap-1.5' }}>
              <div
                className="inline-flex items-center gap-0.5 rounded bg-panel-field p-0.5 hover:bg-panel-field-hover"
                role="toolbar"
                aria-label={panels.textFormatting}
              >
                <IconButton
                  label={`${menu.bold} (${appMenuShortcutLabel('text.bold')})`}
                  size="md"
                  active={ctx.activeFormatting.includes('bold')}
                  onClick={ctx.actions.toggleBold}
                >
                  <IconLucideBold className="size-3.5" />
                </IconButton>
                <IconButton
                  label={`${menu.italic} (${appMenuShortcutLabel('text.italic')})`}
                  size="md"
                  active={ctx.activeFormatting.includes('italic')}
                  onClick={ctx.actions.toggleItalic}
                >
                  <IconLucideItalic className="size-3.5" />
                </IconButton>
                <IconButton
                  label={`${menu.underline} (${appMenuShortcutLabel('text.underline')})`}
                  size="md"
                  active={ctx.activeFormatting.includes('underline')}
                  onClick={() => ctx.actions.toggleDecoration('UNDERLINE')}
                >
                  <IconLucideUnderline className="size-3.5" />
                </IconButton>
                <IconButton
                  label={menu.strikethrough}
                  size="md"
                  active={ctx.activeFormatting.includes('strikethrough')}
                  onClick={() => ctx.actions.toggleDecoration('STRIKETHROUGH')}
                >
                  <IconLucideStrikethrough className="size-3.5" />
                </IconButton>
              </div>
            </PanelFieldGroup>

            <PanelGrid columns="two" className="mb-3">
              <PanelFieldGroup label={panels.textCase}>
                <AppSelect
                  label={panels.textCase}
                  value={ctx.node.textCase}
                  options={textCaseOptions}
                  onValueChange={(value) =>
                    ctx.actions.setTextCase(value as 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE')
                  }
                />
              </PanelFieldGroup>
              <PanelFieldGroup label={panels.truncation}>
                <AppSelect
                  label={panels.truncation}
                  value={ctx.node.textTruncation}
                  options={truncationOptions}
                  onValueChange={(value) =>
                    ctx.actions.setTruncation(value as 'DISABLED' | 'ENDING')
                  }
                />
              </PanelFieldGroup>
            </PanelGrid>

            {ctx.node.textTruncation === 'ENDING' ? (
              <PanelFieldGroup label={panels.maxLines} className="mb-3">
                <NumberField
                  value={ctx.node.maxLines ?? 1}
                  aria-label={panels.maxLines}
                  min={1}
                  step={1}
                  data-property="max-lines"
                  onValueChange={(value) =>
                    ctx.actions.updateProp('maxLines', Math.max(1, Math.round(value)))
                  }
                  onCommit={(value, previous) => ctx.actions.commitProp('maxLines', value, previous)}
                />
              </PanelFieldGroup>
            ) : null}

            <div className="mb-3 grid gap-2.5">
              {commonFeatures.map((feature) => (
                <label
                  key={feature.tag}
                  className="flex items-center justify-between gap-1.5 text-[11px] text-muted/70"
                >
                  <span>{feature.label}</span>
                  <AppSwitch
                    checked={featureEnabled(ctx.node?.fontFeatures ?? [], feature.tag)}
                    label={feature.label}
                    data-property={`font-feature-${feature.tag.toLowerCase()}`}
                    onCheckedChange={(enabled) => ctx.actions.setFontFeature(feature.tag, enabled)}
                  />
                </label>
              ))}
            </div>
          </PanelSection>
        ) : null
      }
    </TypographyControlsRoot>
  )
})

TypographySection.displayName = 'TypographySection'
export default TypographySection
