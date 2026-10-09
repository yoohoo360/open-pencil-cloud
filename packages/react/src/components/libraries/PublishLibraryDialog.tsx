import { useStore } from '@nanostores/react'
import { Component, LayoutTemplate, PackageCheck, SearchX, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { IS_BROWSER } from '@open-pencil/core/constants'
import type { LibraryAssetChange } from '@open-pencil/core/library'
import {
  ensureLibraryAssetKeys,
  publishableLibraryRoots,
  readSourceLibraryPublication
} from '@open-pencil/core/library'

import { publishLibraryRevisionToCloud } from '#react/app/document/libraries'
import {
  closePublishLibraryDialog,
  publishLibraryDialogOpen,
  useLibraryService
} from '#react/app/libraries'
import { useEditorStore } from '#react/app/editor/store'
import { useDialogUI } from '#react/components/ui/dialog'
import { AppInput } from '#react/components/ui/AppInput'
import { AppPlaceholder } from '#react/components/ui/AppPlaceholder'
import { useI18n } from '#react/i18n'

function changeKindClass(kind: LibraryAssetChange['kind']): string {
  switch (kind) {
    case 'added':
      return 'text-emerald-500'
    case 'modified':
      return 'text-sky-500'
    case 'renamed':
      return 'text-amber-500'
    case 'removed':
      return 'text-danger'
  }
}

export function PublishLibraryDialog() {
  const open = useStore(publishLibraryDialogOpen)
  const store = useEditorStore()
  const service = useLibraryService()
  const { panels } = useI18n()
  const cls = useDialogUI(
    {
      overlay: 'z-[100]',
      content: 'z-[110]'
    },
    { size: 'md', height: 'tall' }
  )
  const [libraryId, setLibraryId] = useState('')
  const [libraryName, setLibraryName] = useState('')
  const [description, setDescription] = useState('')
  const [query, setQuery] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [changes, setChanges] = useState<LibraryAssetChange[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set())

  const publication = useMemo(() => readSourceLibraryPublication(store.graph), [store, store.state.sceneVersion])
  const changeLabels = useMemo(
    () => ({
      added: panels.libraryChangeAdded,
      modified: panels.libraryChangeModified,
      renamed: panels.libraryChangeRenamed,
      removed: panels.libraryChangeRemoved
    }),
    [panels]
  )
  const visibleChanges = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return normalized
      ? changes.filter((change) => change.asset.name.toLowerCase().includes(normalized))
      : changes
  }, [changes, query])
  const selectionState = useMemo((): boolean | 'indeterminate' => {
    const visibleKeys = visibleChanges.map((change) => change.asset.key)
    const selectedVisible = visibleKeys.filter((key) => selectedKeys.has(key)).length
    if (selectedVisible === 0) return false
    return selectedVisible === visibleKeys.length ? true : 'indeterminate'
  }, [selectedKeys, visibleChanges])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError('')
    setQuery('')
    setDescription('')
    setLoading(true)
    const existing = readSourceLibraryPublication(store.graph)
    setLibraryId(existing?.libraryId ?? '')
    setLibraryName(existing?.name ?? store.graph.getNode(store.graph.rootId)?.name ?? '')
    void (async () => {
      try {
        let nextChanges: LibraryAssetChange[]
        if (existing) {
          const discovered = await service.discoverPublicationChanges(store)
          nextChanges = discovered.changes
        } else {
          const roots = publishableLibraryRoots(store.graph)
          ensureLibraryAssetKeys(
            store.graph,
            roots.map((node) => node.id)
          )
          nextChanges = roots.map((node) => ({
            kind: 'added' as const,
            asset: {
              key: node.componentKey ?? node.id,
              name: node.name,
              description: '',
              type: node.type,
              sourceNodeId: node.id,
              contentHash: ''
            }
          }))
        }
        if (cancelled) return
        setChanges(nextChanges)
        setSelectedKeys(new Set(nextChanges.map((change) => change.asset.key)))
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : panels.libraryPublishFailed)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, panels.libraryPublishFailed, service, store])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' || event.code === 'Escape') closePublishLibraryDialog()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function toggleAll(value: boolean) {
    const visibleKeys = visibleChanges.map((change) => change.asset.key)
    setSelectedKeys((current) => {
      const next = new Set(current)
      for (const key of visibleKeys) {
        if (value) next.add(key)
        else next.delete(key)
      }
      return next
    })
  }

  function toggleAsset(key: string, value: boolean) {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (value) next.add(key)
      else next.delete(key)
      return next
    })
  }

  async function publish() {
    const id = libraryId.trim()
    const name = libraryName.trim()
    if (!id || !name || selectedKeys.size === 0 || publishing) return
    setPublishing(true)
    setError('')
    try {
      const revision = await service.publishSelected(store, {
        libraryId: id,
        name,
        description,
        selectedAssetKeys: selectedKeys
      })
      await publishLibraryRevisionToCloud(store, revision)
      closePublishLibraryDialog()
      void service.refresh(store)
      store.notify()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : panels.libraryPublishFailed)
    } finally {
      setPublishing(false)
    }
  }

  if (!IS_BROWSER || !open) return null

  return createPortal(
    <>
      <div data-slot="dialog-overlay" className={cls.overlay} onClick={closePublishLibraryDialog} />
      <div
        role="dialog"
        aria-modal="true"
        data-slot="dialog-content"
        data-test-id="publish-library-dialog"
        className={cls.content}
      >
        <div className={cls.header}>
          <div className={cls.heading}>
            <h2 className={cls.title}>{panels.publishLibrary}</h2>
            <p className={cls.description}>{panels.publishLibraryHelp}</p>
          </div>
          <button
            type="button"
            className={cls.close}
            aria-label={panels.cancel}
            onClick={closePublishLibraryDialog}
          >
            <X className="size-4" />
          </button>
        </div>
        <form
          className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-4"
          onSubmit={(event) => {
            event.preventDefault()
            void publish()
          }}
        >
          {!publication ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                {panels.libraryId}
                <AppInput
                  value={libraryId}
                  required
                  onChange={(event) => setLibraryId(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                {panels.libraryName}
                <AppInput
                  value={libraryName}
                  required
                  onChange={(event) => setLibraryName(event.target.value)}
                />
              </label>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg bg-hover/60 px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-surface">{libraryName || publication.name}</div>
                <div className="truncate text-[11px] text-muted">{publication.libraryId}</div>
              </div>
              <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                {panels.cloudLibraries}
              </span>
            </div>
          )}
          <label className="flex flex-col gap-1.5 text-xs text-muted">
            {panels.revisionDescription}
            <textarea
              className="min-h-16 resize-none rounded-lg border border-border bg-input px-3 py-2 text-xs text-surface outline-none focus:border-accent"
              rows={3}
              placeholder={panels.revisionDescriptionPlaceholder}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <div className="flex items-center gap-2">
            <AppInput
              type="search"
              placeholder={panels.searchLibraryChanges}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border">
            <div className="flex items-center gap-2 border-b border-border bg-hover/40 px-3 py-2 text-xs font-medium">
              <input
                type="checkbox"
                aria-label={panels.libraryChanges}
                checked={selectionState === true}
                ref={(input) => {
                  if (input) input.indeterminate = selectionState === 'indeterminate'
                }}
                onChange={(event) => toggleAll(event.target.checked)}
              />
              <span>{panels.libraryChanges}</span>
              <span className="ml-auto tabular-nums text-muted">
                {selectedKeys.size}/{changes.length}
              </span>
            </div>
            {loading ? (
              <div className="px-3 py-6 text-center text-xs text-muted">{panels.loading}</div>
            ) : changes.length === 0 ? (
              <AppPlaceholder
                label={panels.noLibraryAssetChanges}
                size="compact"
                icon={<PackageCheck className="size-4" />}
              />
            ) : visibleChanges.length === 0 ? (
              <AppPlaceholder
                label={panels.noLibraryChangesFound}
                size="compact"
                icon={<SearchX className="size-4" />}
              />
            ) : (
              <div className="min-h-0 overflow-y-auto">
                {visibleChanges.map((change) => (
                  <label
                    key={change.asset.key}
                    className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-hover/50"
                  >
                    <input
                      type="checkbox"
                      aria-label={change.asset.name}
                      checked={selectedKeys.has(change.asset.key)}
                      onChange={(event) => toggleAsset(change.asset.key, event.target.checked)}
                    />
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-canvas text-component">
                      {change.asset.type === 'COMPONENT_SET' ? (
                        <LayoutTemplate className="size-4" aria-hidden="true" />
                      ) : (
                        <Component className="size-4" aria-hidden="true" />
                      )}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-xs text-surface">
                      {change.asset.name}
                    </span>
                    <span className={`text-[10px] font-medium ${changeKindClass(change.kind)}`}>
                      {changeLabels[change.kind]}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {error ? (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          ) : null}
        </form>
        <div className={cls.footer}>
          <button
            type="button"
            className="cursor-pointer rounded-md border border-border bg-transparent px-3 py-1.5 text-xs text-surface hover:bg-hover"
            onClick={closePublishLibraryDialog}
          >
            {panels.cancel}
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-md border-none bg-accent px-3.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={
              publishing ||
              loading ||
              selectedKeys.size === 0 ||
              !libraryId.trim() ||
              !libraryName.trim()
            }
            onClick={() => void publish()}
          >
            {publishing ? panels.publishingLibrary : panels.publishLibrary}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
