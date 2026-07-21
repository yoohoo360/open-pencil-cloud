import { memo } from 'react'

import { useI18n } from '@open-pencil/react'
import ProviderSettingsKeyField from '@/components/chat/ProviderSettings/ProviderSettingsKeyField'
import { useProviderSettingsContext } from '@/components/chat/ProviderSettings/context'

export const StockPhotoKeysSection = memo(function StockPhotoKeysSection() {
  const ctx = useProviderSettingsContext()
  const { dialogs } = useI18n()

  return (
    <>
      <ProviderSettingsKeyField
        label={dialogs.pexelsAPIKey}
        value={ctx.pexelsKeyInput}
        onValueChange={ctx.setPexelsKeyInput}
        saved={!!ctx.pexelsApiKey}
        kind="pexels"
        placeholder={ctx.hasExistingPexelsKey ? dialogs.keySavedReplace : dialogs.stockPhotoToolOptional}
        keyUrl="https://www.pexels.com/api/"
        keyUrlLabel={dialogs.getPexelsAPIKey}
        onClear={ctx.clearPexelsKey}
        onChangeCommit={ctx.save}
      />
      <ProviderSettingsKeyField
        label={dialogs.unsplashAccessKey}
        value={ctx.unsplashKeyInput}
        onValueChange={ctx.setUnsplashKeyInput}
        saved={!!ctx.unsplashAccessKey}
        kind="unsplash"
        placeholder={
          ctx.hasExistingUnsplashKey ? dialogs.keySavedReplace : dialogs.pexelsAlternativeOptional
        }
        keyUrl="https://unsplash.com/oauth/applications"
        keyUrlLabel={dialogs.getUnsplashAccessKey}
        onClear={ctx.clearUnsplashKey}
        onChangeCommit={ctx.save}
      />
    </>
  )
})

StockPhotoKeysSection.displayName = 'StockPhotoKeysSection'
export default StockPhotoKeysSection
