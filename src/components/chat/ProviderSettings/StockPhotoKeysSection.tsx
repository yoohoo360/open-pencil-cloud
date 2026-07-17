import { useI18n } from '@open-pencil/react'
import { ProviderSettingsKeyField } from '@/components/chat/ProviderSettings/ProviderSettingsKeyField'
import { useProviderSettingsContext } from '@/components/chat/ProviderSettings/context'

export function StockPhotoKeysSection() {
  const ctx = useProviderSettingsContext()
  const { dialogs } = useI18n()

  return (
    <>
      <ProviderSettingsKeyField
        label={dialogs.pexelsAPIKey}
        value={ctx.pexelsKeyInput}
        saved={!!ctx.pexelsApiKey.get()}
        kind="pexels"
        placeholder={ctx.hasExistingPexelsKey ? dialogs.keySavedReplace : dialogs.stockPhotoToolOptional}
        keyUrl="https://www.pexels.com/api/"
        keyUrlLabel={dialogs.getPexelsAPIKey}
        onChange={ctx.setPexelsKeyInput}
        onClear={ctx.clearPexelsKey}
      />
      <ProviderSettingsKeyField
        label={dialogs.unsplashAccessKey}
        value={ctx.unsplashKeyInput}
        saved={!!ctx.unsplashAccessKey.get()}
        kind="unsplash"
        placeholder={ctx.hasExistingUnsplashKey ? dialogs.keySavedReplace : dialogs.pexelsAlternativeOptional}
        keyUrl="https://unsplash.com/oauth/applications"
        keyUrlLabel={dialogs.getUnsplashAccessKey}
        onChange={ctx.setUnsplashKeyInput}
        onClear={ctx.clearUnsplashKey}
      />
    </>
  )
}
