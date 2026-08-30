import { useEditorStore } from '#react/app/editor/store'
import { AssetRemoteThumbnail } from '#react/components/assets-panel/AssetRemoteThumbnail'
import {
  LOCAL_LIBRARY_KEY,
  assetMatchesComponentId,
  filterAssets,
  groupAssets,
  listAssetLibraries,
  listAssets,
  type LocalAsset
} from '#react/components/assets-panel/assets'
import { AssetThumbnail } from '#react/components/assets-panel/AssetThumbnail'
import { AppInput } from '#react/components/ui/AppInput'
import { AppPlaceholder } from '#react/components/ui/AppPlaceholder'
import { AppSelect } from '#react/components/ui/AppSelect'
import { ASSET_LIST_THUMBNAIL_SIZE } from '#react/constants'
import { getLib } from '#react/graph/remote-lib'
import { useI18n } from '#react/i18n'
import { useOverlayScrollbar } from '#react/internal/overlay-scrollbar/use'
import { Component } from 'lucide-react'
import { useMemo, useState } from 'react'

export const PREFERRED_LIBRARY_KEY = 'preferred'
const EMPTY_IDS: string[] = []

export function matchesPreferredAsset(asset: LocalAsset, preferred: ReadonlySet<string>): boolean {
  for (const id of preferred) {
    if (assetMatchesComponentId(asset, id)) return true
  }
  return false
}

export function SlotInstancePicker({
  preferredValues,
  onlyPreferredInstances = false,
  excludeIds,
  selectedId,
  onSelect
}: {
  preferredValues?: string[]
  onlyPreferredInstances?: boolean
  excludeIds?: string[]
  selectedId?: string
  onSelect: (componentId: string, sourceLibraryKey?: string) => void
}) {
  const store = useEditorStore()
  const { panels } = useI18n()
  const preferredIds = preferredValues ?? EMPTY_IDS
  const excludedIds = excludeIds ?? EMPTY_IDS
  const preferred = useMemo(() => new Set(preferredIds), [preferredIds])
  const excluded = useMemo(() => new Set(excludedIds), [excludedIds])
  const libraries = useMemo(
    () => listAssetLibraries(store.graph, panels.createdInThisFile),
    [panels.createdInThisFile, store.graph, store.state.sceneVersion]
  )
  const [libKey, setLibKey] = useState(LOCAL_LIBRARY_KEY)
  const [query, setQuery] = useState('')
  const scrollRef = useOverlayScrollbar<HTMLDivElement>()

  const libOptions = [
    ...libraries.map((library) => ({ value: library.key, label: library.name })),
    ...(preferred.size > 0
      ? [{ value: PREFERRED_LIBRARY_KEY, label: panels.slotPreferredInstances }]
      : [])
  ]
  const activeLib = libOptions.some((option) => option.value === libKey)
    ? libKey
    : (libOptions[0]?.value ?? LOCAL_LIBRARY_KEY)

  const assets = useMemo(() => {
    const fromLibrary = (key: string): Array<LocalAsset & { libraryKey?: string }> => {
      const library = libraries.find((item) => item.key === key)
      if (!library) return []
      const graph = library.remote
        ? (getLib(store.graph, library.key)?.graph ?? store.graph)
        : store.graph
      const libraryKey = library.remote ? library.key : undefined
      return listAssets(store, graph, panels.page).map((asset) => ({ ...asset, libraryKey }))
    }
    const collected =
      activeLib === PREFERRED_LIBRARY_KEY
        ? libraries.flatMap((library) => fromLibrary(library.key))
        : fromLibrary(activeLib)
    return collected.filter((asset) => {
      if (!asset.componentId || excluded.has(asset.componentId) || excluded.has(asset.id))
        return false
      if (activeLib === PREFERRED_LIBRARY_KEY) return matchesPreferredAsset(asset, preferred)
      if (onlyPreferredInstances && preferred.size > 0)
        return matchesPreferredAsset(asset, preferred)
      return true
    })
  }, [
    activeLib,
    excluded,
    libraries,
    onlyPreferredInstances,
    panels.page,
    preferred,
    store,
    store.state.sceneVersion
  ])
  const filtered = useMemo(() => filterAssets(assets, query), [assets, query])
  const groups = useMemo(() => groupAssets(filtered), [filtered])

  return (
    <div className="flex w-72 flex-col gap-2 p-2" data-test-id="slot-instance-picker">
      <AppSelect
        label={panels.createdInThisFile}
        data-test-id="slot-instance-library"
        value={activeLib}
        options={libOptions}
        onChange={setLibKey}
      />
      <AppInput
        type="search"
        data-test-id="slot-instance-search"
        size="sm"
        placeholder={panels.searchLocalComponents}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div ref={scrollRef} className="scrollbar-overlay max-h-72 overflow-y-auto">
        {filtered.length === 0 ? (
          <AppPlaceholder
            data-test-id="slot-instance-empty"
            label={panels.noLocalComponents}
            size="compact"
            fill={false}
            icon={<Component className="size-4" />}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((group) => (
              <div
                key={group.pageId || 'ungrouped'}
                data-test-id="asset-group"
                className="flex flex-col gap-1.5"
              >
                {group.pageName ? (
                  <div className="truncate px-0.5 text-[10px] font-medium tracking-wide text-muted uppercase">
                    {group.pageName}
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-1.5">
                  {group.assets.map((asset) => {
                    const libraryKey = asset.libraryKey
                    return (
                      <button
                        key={`${libraryKey ?? 'local'}:${asset.id}`}
                        type="button"
                        data-test-id="slot-instance-item"
                        data-asset-id={asset.id}
                        className={`flex min-w-0 flex-col items-center gap-1 rounded p-1.5 text-left text-xs text-surface hover:bg-hover ${
                          selectedId && assetMatchesComponentId(asset, selectedId)
                            ? 'bg-component/10 ring-1 ring-component'
                            : ''
                        }`}
                        onClick={() => {
                          if (asset.componentId) onSelect(asset.componentId, libraryKey)
                        }}
                      >
                        {asset.componentId && libraryKey ? (
                          <AssetRemoteThumbnail
                            nodeId={asset.componentId}
                            remoteKey={libraryKey}
                            alt={`${asset.name} preview`}
                            size={ASSET_LIST_THUMBNAIL_SIZE}
                          />
                        ) : asset.componentId ? (
                          <AssetThumbnail
                            nodeId={asset.componentId}
                            alt={`${asset.name} preview`}
                            size={ASSET_LIST_THUMBNAIL_SIZE}
                          />
                        ) : (
                          <Component className="size-4 text-component" aria-hidden="true" />
                        )}
                        <span className="w-full truncate text-center text-[11px]">
                          {asset.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
