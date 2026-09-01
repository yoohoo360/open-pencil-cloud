import { BuiltinTextField } from '#react/components/properties/builtin-text/BuiltinTextField'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { BuiltinEditorModeProvider } from '#react/controls/builtin-text/mode'
import { useBuiltinText } from '#react/controls/builtin-text/use'
import { useI18n } from '#react/i18n'
import { memo } from 'react'

export const BuiltinTextSection = memo(function BuiltinTextSection() {
  const { host, selectionId, html, markdown, applyMarkdown, insertImage } = useBuiltinText()
  const { panels } = useI18n()
  if (!host) return null

  return (
    <BuiltinEditorModeProvider>
      <PanelSection label={panels.builtinText}>
        <BuiltinTextField
          key={host.id}
          selectionId={selectionId}
          html={html}
          markdown={markdown}
          onApply={applyMarkdown}
          onInsertImage={insertImage}
        />
      </PanelSection>
    </BuiltinEditorModeProvider>
  )
})
