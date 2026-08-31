import {
  formatVersionTimestamp,
  versionDisplayName
} from '#react/app/document/version-history/format'
import { groupVersionHistory } from '#react/app/document/version-history/group'
import type { DocumentVersion } from '#react/app/document/version-history/types'
import { appMenuShortcut } from '#react/app/shell/menu/shortcut'
import { AppButton } from '#react/components/ui/AppButton'
import { AppShortcutText } from '#react/components/ui/AppShortcutText'
import { IconButton } from '#react/components/ui/IconButton'
import { PanelHeader } from '#react/components/ui/panel/PanelHeader'
import { useVersionHistory } from '#react/components/VersionHistory/context'
import { SaveVersionDialog } from '#react/components/VersionHistory/SaveVersionDialog'
import { formatShortcut } from '#react/editor/commands'
import { useI18n } from '#react/i18n'
import { useOverlayScrollbar } from '#react/internal/overlay-scrollbar/use'
import { ChevronDown, History, Plus, X } from 'lucide-react'

function rowClass(selected: boolean) {
  return [
    'flex w-full cursor-pointer flex-col gap-0.5 rounded-md px-2 py-1.5 text-left',
    selected ? 'bg-hover text-surface' : 'text-surface hover:bg-hover/70'
  ].join(' ')
}

function VersionMeta({ version, locale }: { version: DocumentVersion; locale: string }) {
  const stamp = formatVersionTimestamp(version.created_at, locale)
  const name = versionDisplayName(version)
  const author = version.created_by_name?.trim()
  const showAuthor = Boolean(author && author !== name)
  return (
    <>
      <span className="truncate text-xs font-medium">{name}</span>
      <span className="truncate text-[11px] text-muted">
        {showAuthor ? `${author}  ${stamp}` : stamp}
      </span>
    </>
  )
}

export function VersionHistoryPanel() {
  const { dialogs, locale } = useI18n()
  const scrollRef = useOverlayScrollbar<HTMLDivElement>()
  const history = useVersionHistory()
  const shortcut = formatShortcut(appMenuShortcut('save-version') ?? 'MOD+ALT+S') ?? '⌥⌘S'
  const rows = groupVersionHistory(history.list?.autosaves ?? [], history.list?.named ?? [])
  const selectedHistorical = history.selectedId !== 'current'

  return (
    <aside
      data-test-id="version-history-panel"
      className="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-border bg-panel"
    >
      <PanelHeader
        icon={<History className="size-3.5" />}
        actions={
          <>
            <IconButton
              label={dialogs.saveVersion}
              disabled={Boolean(history.previewVersion) || history.saving}
              onClick={() => history.requestSaveNamed()}
            >
              <Plus className="size-3.5" />
            </IconButton>
            <IconButton label={dialogs.close} onClick={() => history.close()}>
              <X className="size-3.5" />
            </IconButton>
          </>
        }
      >
        {dialogs.versionHistory}
      </PanelHeader>
      <p className="border-b border-border px-3 py-2 text-[11px] leading-4 text-muted">
        {dialogs.versionHistoryShortcutHint({ shortcut })}
      </p>
      {history.error ? (
        <p className="px-3 py-2 text-[11px] text-danger" role="alert">
          {history.error}
        </p>
      ) : null}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-overlay px-1.5 py-1">
        {rows.map((row) => {
          if (row.type === 'current') {
            return (
              <button
                key="current"
                type="button"
                data-test-id="version-history-current"
                className={rowClass(history.selectedId === 'current')}
                onClick={() => void history.selectCurrent()}
              >
                <span className="text-xs font-medium">{dialogs.currentVersion}</span>
                {history.list?.current_updated_at ? (
                  <span className="text-[11px] text-muted">
                    {formatVersionTimestamp(history.list.current_updated_at, locale)}
                  </span>
                ) : null}
              </button>
            )
          }
          if (row.type === 'autosave-group') {
            const preview = history.autosavesExpanded ? row.versions : row.versions.slice(0, 2)
            return (
              <div key="autosaves" className="mt-1">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-medium text-surface hover:bg-hover/70"
                  onClick={() => history.toggleAutosaves()}
                >
                  <span>
                    {dialogs.autosaveVersions({
                      count: history.list?.autosave_count ?? row.versions.length
                    })}
                  </span>
                  <ChevronDown
                    className={`size-3.5 text-muted transition-transform ${history.autosavesExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
                {preview.map((version) => (
                  <button
                    key={version.id}
                    type="button"
                    className={rowClass(history.selectedId === version.id)}
                    onClick={() => void history.selectVersion(version)}
                  >
                    <AppShortcutText>
                      {formatVersionTimestamp(version.created_at, locale)}
                    </AppShortcutText>
                  </button>
                ))}
              </div>
            )
          }
          return (
            <button
              key={row.version.id}
              type="button"
              className={rowClass(history.selectedId === row.version.id)}
              onClick={() => void history.selectVersion(row.version)}
            >
              <VersionMeta version={row.version} locale={locale} />
            </button>
          )
        })}
        {history.list?.named_has_more ? (
          <button
            type="button"
            className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs text-accent hover:bg-hover/70"
            onClick={() => history.loadOlder()}
          >
            {dialogs.showOlder}
          </button>
        ) : null}
        {history.loading && !history.list ? (
          <p className="px-2 py-3 text-[11px] text-muted">{dialogs.loadingVersions}</p>
        ) : null}
      </div>
      {selectedHistorical ? (
        <div className="border-t border-border px-3 py-2">
          <AppButton
            color="primary"
            variant="solid"
            className="w-full"
            disabled={history.restoring}
            onClick={() => void history.restoreSelected()}
          >
            {dialogs.restoreVersion}
          </AppButton>
        </div>
      ) : null}
      {history.saveDialogOpen ? (
        <SaveVersionDialog
          saving={history.saving}
          onClose={() => history.setSaveDialogOpen(false)}
          onSave={(title, description) => void history.saveNamed(title, description)}
        />
      ) : null}
    </aside>
  )
}
