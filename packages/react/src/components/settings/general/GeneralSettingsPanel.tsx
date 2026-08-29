import { useStore } from '@nanostores/react'

import { appPreferences, updateRecoveryEnabled } from '#react/app/settings/preferences'
import { setSnappingPreference } from '#react/app/shell/menu/editor-actions'
import { useEditorStore } from '#react/app/editor/store'
import { AppSwitch } from '#react/components/ui/AppSwitch'
import { useI18n } from '#react/i18n'

export function GeneralSettingsPanel() {
  const { dialogs } = useI18n()
  const store = useEditorStore()
  const preferences = useStore(appPreferences)
  const snapping = store.state.snappingPreferences

  return (
    <section className="flex flex-col gap-4" data-test-id="settings-general-panel">
      <div>
        <h3 className="text-xs font-semibold text-surface">{dialogs.settingsRecovery}</h3>
        <p className="mt-1 text-[11px] text-muted">{dialogs.settingsRecoveryDescription}</p>
      </div>

      <div className="flex flex-col rounded border border-border">
        <label className="flex items-center justify-between gap-4 px-3 py-2.5">
          <span>
            <span className="block text-xs text-surface">{dialogs.preserveUnsavedWork}</span>
            <span className="block text-[10px] text-muted">
              {dialogs.preserveUnsavedWorkDescription}
            </span>
          </span>
          <AppSwitch
            checked={preferences.recovery.enabled}
            label={dialogs.preserveUnsavedWork}
            data-test-id="settings-recovery-enabled"
            onCheckedChange={updateRecoveryEnabled}
          />
        </label>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-surface">{dialogs.settingsEditing}</h3>
        <p className="mt-1 text-[11px] text-muted">{dialogs.settingsSnappingDescription}</p>
      </div>

      <div className="flex flex-col divide-y divide-border rounded border border-border">
        <label className="flex items-center justify-between gap-4 px-3 py-2.5">
          <span>
            <span className="block text-xs text-surface">{dialogs.snapToGeometry}</span>
            <span className="block text-[10px] text-muted">{dialogs.snapToGeometryDescription}</span>
          </span>
          <AppSwitch
            checked={snapping.geometry}
            label={dialogs.snapToGeometry}
            data-test-id="settings-snap-geometry"
            onCheckedChange={(enabled) => setSnappingPreference(store, 'geometry', enabled)}
          />
        </label>
        <label className="flex items-center justify-between gap-4 px-3 py-2.5">
          <span>
            <span className="block text-xs text-surface">{dialogs.snapToObjects}</span>
            <span className="block text-[10px] text-muted">{dialogs.snapToObjectsDescription}</span>
          </span>
          <AppSwitch
            checked={snapping.objects}
            label={dialogs.snapToObjects}
            data-test-id="settings-snap-objects"
            onCheckedChange={(enabled) => setSnappingPreference(store, 'objects', enabled)}
          />
        </label>
        <label className="flex items-center justify-between gap-4 px-3 py-2.5">
          <span>
            <span className="block text-xs text-surface">{dialogs.snapToPixelGrid}</span>
            <span className="block text-[10px] text-muted">{dialogs.snapToPixelGridDescription}</span>
          </span>
          <AppSwitch
            checked={snapping.pixelGrid}
            label={dialogs.snapToPixelGrid}
            data-test-id="settings-snap-pixel-grid"
            onCheckedChange={(enabled) => setSnappingPreference(store, 'pixelGrid', enabled)}
          />
        </label>
      </div>

      <p className="text-[10px] text-muted">{dialogs.snapTemporaryDisableHint}</p>
    </section>
  )
}
