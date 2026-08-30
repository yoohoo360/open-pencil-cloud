import { useEffect, useState } from 'react'

import { FontPicker } from '#react/components/font-picker/FontPicker'
import { NumberField } from '#react/components/inputs/NumberField'
import { AppInput } from '#react/components/ui/AppInput'
import { AppSelect } from '#react/components/ui/AppSelect'
import { AppSwitch } from '#react/components/ui/AppSwitch'
import { PanelFieldGroup } from '#react/components/ui/panel/PanelFieldGroup'
import { PanelGrid } from '#react/components/ui/panel/PanelGrid'
import { TYPOGRAPHY_WEIGHTS } from '#react/controls/typography'
import { useI18n } from '#react/i18n'
import { loadFont } from '#react/app/editor/fonts'

import { weightToStyle } from '@open-pencil/core/text'
import type { SceneNode } from '@open-pencil/scene-graph'

export function TextStyleEditor({
  node,
  onRename,
  onChange
}: {
  node: SceneNode
  onRename: (name: string) => void
  onChange: (changes: Partial<SceneNode>) => void
}) {
  const { panels, menu } = useI18n()
  const [nameDraft, setNameDraft] = useState(node.name)

  useEffect(() => {
    setNameDraft(node.name)
  }, [node.id, node.name])

  function commitName() {
    const next = nameDraft.trim()
    if (!next) {
      setNameDraft(node.name)
      return
    }
    onRename(next)
  }

  return (
    <div className="flex flex-col gap-2.5" data-test-id="text-style-editor">
      <PanelFieldGroup label={panels.styleName}>
        <AppInput
          value={nameDraft}
          aria-label={panels.styleName}
          onChange={(event) => setNameDraft(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitName()
          }}
        />
      </PanelFieldGroup>
      <FontPicker
        value={node.fontFamily}
        label={panels.fontFamily}
        onSelect={(family) => {
          void loadFont(family, weightToStyle(node.fontWeight, node.italic))
          onChange({ fontFamily: family })
        }}
      />
      <PanelGrid columns={2}>
        <PanelFieldGroup label={panels.fontWeight}>
          <AppSelect
            label={panels.fontWeight}
            value={node.fontWeight}
            options={TYPOGRAPHY_WEIGHTS}
            onChange={(value) => {
              void loadFont(node.fontFamily, weightToStyle(value, node.italic))
              onChange({ fontWeight: value })
            }}
          />
        </PanelFieldGroup>
        <PanelFieldGroup label={panels.fontSize}>
          <NumberField
            aria-label={panels.fontSize}
            min={1}
            max={1000}
            value={node.fontSize}
            onCommit={(value) => onChange({ fontSize: value })}
          />
        </PanelFieldGroup>
      </PanelGrid>
      <PanelGrid columns={2}>
        <PanelFieldGroup label={panels.lineHeight}>
          <NumberField
            aria-label={panels.lineHeight}
            min={0}
            value={node.lineHeight ?? Math.round((node.fontSize || 14) * 1.2)}
            onCommit={(value) => onChange({ lineHeight: value })}
          />
        </PanelFieldGroup>
        <PanelFieldGroup label={panels.letterSpacing}>
          <NumberField
            suffix="%"
            aria-label={panels.letterSpacing}
            value={node.letterSpacing}
            onCommit={(value) => onChange({ letterSpacing: value })}
          />
        </PanelFieldGroup>
      </PanelGrid>
      <PanelFieldGroup label={panels.textCase}>
        <AppSelect
          label={panels.textCase}
          value={node.textCase}
          options={[
            { value: 'ORIGINAL', label: panels.textCaseOriginal },
            { value: 'UPPER', label: panels.textCaseUpper },
            { value: 'LOWER', label: panels.textCaseLower },
            { value: 'TITLE', label: panels.textCaseTitle }
          ]}
          onChange={(value) => onChange({ textCase: value })}
        />
      </PanelFieldGroup>
      <label className="flex items-center justify-between gap-1.5 text-[11px] text-muted">
        <span>{menu.italic}</span>
        <AppSwitch
          checked={node.italic}
          label={menu.italic}
          onCheckedChange={(checked) => onChange({ italic: checked })}
        />
      </label>
    </div>
  )
}
