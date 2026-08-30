import { FontPicker } from '#react/components/font-picker/FontPicker'
import { FontSettingsPopover } from '#react/components/font-settings/FontSettingsPopover'
import { NumberField } from '#react/components/inputs/NumberField'
import { TextStylePicker } from '#react/components/properties/shared-style/TextStylePicker'
import { VariableNumberField } from '#react/components/properties/VariableNumberField'
import { AppSelect } from '#react/components/ui/AppSelect'
import { IconButton } from '#react/components/ui/IconButton'
import { PanelFieldGroup } from '#react/components/ui/panel/PanelFieldGroup'
import { PanelGrid } from '#react/components/ui/panel/PanelGrid'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { SegmentedControl } from '#react/components/ui/SegmentedControl'
import { Tip } from '#react/components/ui/Tip'
import { useTypography } from '#react/controls/typography'
import { useI18n } from '#react/i18n'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Bold,
  Italic,
  Strikethrough,
  TriangleAlert,
  Underline
} from 'lucide-react'

export function TypographySection() {
  const ctx = useTypography()
  const { panels, menu } = useI18n()
  const node = ctx.node
  if (!node || node.type !== 'TEXT') return null

  const alignmentOptions = [
    { value: 'LEFT', label: panels.alignLeft },
    { value: 'CENTER', label: panels.alignCenterHorizontally },
    { value: 'RIGHT', label: panels.alignRight },
    { value: 'JUSTIFIED', label: panels.textAlignment }
  ]
  const verticalAlignmentOptions = [
    { value: 'TOP', label: panels.alignTop },
    { value: 'CENTER', label: panels.alignCenterVertically },
    { value: 'BOTTOM', label: panels.alignBottom }
  ]
  const textCaseOptions = [
    { value: 'ORIGINAL', label: panels.textCaseOriginal },
    { value: 'UPPER', label: panels.textCaseUpper },
    { value: 'LOWER', label: panels.textCaseLower },
    { value: 'TITLE', label: panels.textCaseTitle }
  ]
  const truncationOptions = [
    { value: 'DISABLED', label: panels.truncationDisabled },
    { value: 'ENDING', label: panels.truncationEnding }
  ]
  const commonFeatures = [
    { tag: 'LIGA', label: panels.standardLigatures },
    { tag: 'CALT', label: panels.contextualAlternates },
    { tag: 'KERN', label: panels.kerning }
  ]

  function featureEnabled(tag: string) {
    return node.fontFeatures.find((feature) => feature.tag === tag)?.enabled ?? true
  }

  return (
    <PanelSection label={panels.typography} actions={<TextStylePicker />}>
      <div className="mb-1.5 flex min-w-0 items-center gap-1.5">
        <FontPicker
          value={node.fontFamily}
          label={panels.fontFamily}
          onSelect={(family) => void ctx.setFamily(family)}
        />
        {/*<FontSettingsPopover />*/}
        {ctx.hasMissingFonts ? (
          <Tip
            label={`Missing font${ctx.missingFonts.length > 1 ? 's' : ''}: ${ctx.missingFonts.join(', ')}`}
          >
            <TriangleAlert
              role="img"
              aria-label={`Missing font${ctx.missingFonts.length > 1 ? 's' : ''}: ${ctx.missingFonts.join(', ')}`}
              className="size-3.5 shrink-0 text-[var(--color-warning-action)]"
            />
          </Tip>
        ) : null}
      </div>

      <PanelGrid columns={2} className="mb-3">
        <PanelFieldGroup label={panels.fontWeight}>
          <AppSelect
            label={panels.fontWeight}
            value={node.fontWeight}
            options={ctx.weights}
            onChange={(value) => void ctx.setWeight(value)}
          />
        </PanelFieldGroup>
        <PanelFieldGroup label={panels.fontSize}>
          <VariableNumberField
            aria-label={panels.fontSize}
            min={1}
            max={1000}
            value={node.fontSize}
            nodeId={node.id}
            bindingPath="fontSize"
            onCommit={(value, previous) => ctx.commitProp('fontSize', value, previous)}
          />
        </PanelFieldGroup>
      </PanelGrid>

      <PanelGrid columns={2} className="mb-3">
        <PanelFieldGroup label={panels.lineHeight}>
          <VariableNumberField
            aria-label={panels.lineHeight}
            min={0}
            value={node.lineHeight ?? Math.round((node.fontSize || 14) * 1.2)}
            nodeId={node.id}
            bindingPath="lineHeight"
            onCommit={(value, previous) => ctx.commitProp('lineHeight', value, previous)}
          />
        </PanelFieldGroup>
        <PanelFieldGroup label={panels.letterSpacing}>
          <VariableNumberField
            suffix="%"
            aria-label={panels.letterSpacing}
            value={node.letterSpacing}
            nodeId={node.id}
            bindingPath="letterSpacing"
            onCommit={(value, previous) => ctx.commitProp('letterSpacing', value, previous)}
          />
        </PanelFieldGroup>
      </PanelGrid>

      <PanelFieldGroup label={panels.direction} className="mb-3">
        <AppSelect
          label={panels.direction}
          value={node.textDirection}
          options={[
            { value: 'AUTO', label: panels.auto },
            { value: 'LTR', label: 'LTR' },
            { value: 'RTL', label: 'RTL' }
          ]}
          onChange={ctx.setDirection}
        />
      </PanelFieldGroup>

      <PanelFieldGroup label={panels.textAlignment} className="mb-3">
        <SegmentedControl
          value={node.textAlignHorizontal}
          options={alignmentOptions}
          label={panels.textAlignment}
          onChange={(value) => ctx.setAlign(value as typeof node.textAlignHorizontal)}
          renderOption={(option) => {
            if (option.value === 'LEFT') return <AlignLeft className="size-3.5" />
            if (option.value === 'CENTER') return <AlignCenter className="size-3.5" />
            if (option.value === 'RIGHT') return <AlignRight className="size-3.5" />
            return <AlignJustify className="size-3.5" />
          }}
        />
      </PanelFieldGroup>

      <PanelFieldGroup label={panels.verticalTextAlignment} className="mb-3">
        <SegmentedControl
          value={node.textAlignVertical}
          options={verticalAlignmentOptions}
          label={panels.verticalTextAlignment}
          onChange={(value) => ctx.setVerticalAlign(value as typeof node.textAlignVertical)}
          renderOption={(option) => {
            if (option.value === 'TOP') return <AlignVerticalJustifyStart className="size-3.5" />
            if (option.value === 'CENTER')
              return <AlignVerticalJustifyCenter className="size-3.5" />
            return <AlignVerticalJustifyEnd className="size-3.5" />
          }}
        />
      </PanelFieldGroup>

      <PanelFieldGroup
        label={panels.textFormatting}
        className="mb-3"
        ui={{ container: 'flex-row gap-1.5' }}
      >
        <div
          className="inline-flex items-center gap-0.5 rounded bg-panel-field p-0.5 hover:bg-panel-field-hover"
          role="toolbar"
          aria-label={panels.textFormatting}
        >
          <IconButton
            label={menu.bold}
            size="xs"
            active={ctx.activeFormatting.includes('bold')}
            onClick={ctx.toggleBold}
          >
            <Bold className="size-3.5" />
          </IconButton>
          <IconButton
            label={menu.italic}
            size="xs"
            active={ctx.activeFormatting.includes('italic')}
            onClick={ctx.toggleItalic}
          >
            <Italic className="size-3.5" />
          </IconButton>
          <IconButton
            label={menu.underline}
            size="xs"
            active={ctx.activeFormatting.includes('underline')}
            onClick={() => ctx.toggleDecoration('UNDERLINE')}
          >
            <Underline className="size-3.5" />
          </IconButton>
          <IconButton
            label={menu.strikethrough}
            size="xs"
            active={ctx.activeFormatting.includes('strikethrough')}
            onClick={() => ctx.toggleDecoration('STRIKETHROUGH')}
          >
            <Strikethrough className="size-3.5" />
          </IconButton>
        </div>
      </PanelFieldGroup>

      <PanelGrid columns={2} className="mb-3">
        <PanelFieldGroup label={panels.textCase}>
          <AppSelect
            label={panels.textCase}
            value={node.textCase}
            options={textCaseOptions}
            onChange={ctx.setTextCase}
          />
        </PanelFieldGroup>
        <PanelFieldGroup label={panels.truncation}>
          <AppSelect
            label={panels.truncation}
            value={node.textTruncation}
            options={truncationOptions}
            onChange={ctx.setTruncation}
          />
        </PanelFieldGroup>
      </PanelGrid>

      {node.textTruncation === 'ENDING' ? (
        <PanelFieldGroup label={panels.maxLines} className="mb-3">
          <NumberField
            aria-label={panels.maxLines}
            min={1}
            data-property="max-lines"
            value={node.maxLines ?? 1}
            onCommit={(value, previous) =>
              ctx.commitProp('maxLines', Math.max(1, Math.round(value)), previous)
            }
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
            <input
              type="checkbox"
              className="accent-accent"
              data-property={`font-feature-${feature.tag.toLowerCase()}`}
              checked={featureEnabled(feature.tag)}
              onChange={(event) => ctx.setFontFeature(feature.tag, event.target.checked)}
            />
          </label>
        ))}
      </div>
    </PanelSection>
  )
}
