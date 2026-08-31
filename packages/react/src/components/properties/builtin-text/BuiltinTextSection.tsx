import { BuiltinTextField } from '#react/components/properties/builtin-text/BuiltinTextField'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { useBuiltinText } from '#react/controls/builtin-text/use'
import { useI18n } from '#react/i18n'

export function BuiltinTextSection() {
  const { host, html, preview, beginEdit, commit, insertImage } = useBuiltinText()
  const { panels } = useI18n()
  if (!host) return null

  return (
    <PanelSection label={panels.builtinText}>
      <BuiltinTextField
        html={html}
        onPreview={preview}
        onFocusSnapshot={beginEdit}
        onCommit={commit}
        onInsertImage={insertImage}
      />
    </PanelSection>
  )
}
