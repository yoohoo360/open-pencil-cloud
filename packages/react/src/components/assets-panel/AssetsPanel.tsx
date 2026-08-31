import { attachRemoteLibrary } from '#react/app/document/libraries'
import { nodeIcon } from '#react/app/editor/icons'
import { useEditorStore } from '#react/app/editor/store'
import { AddLibraryDialog } from '#react/components/assets-panel/AddLibraryDialog'
import { AssetDetailsDialog } from '#react/components/assets-panel/AssetDetailsDialog'
import { AssetRemoteThumbnail } from '#react/components/assets-panel/AssetRemoteThumbnail'
import {
  COMPONENT_LIB_MIME,
  COMPONENT_MIME,
  LOCAL_LIBRARY_KEY,
  filterAssets,
  groupAssets,
  insertAssetInstance,
  listAssetLibraries,
  listAssets,
  openExternalLink,
  type LocalAsset
} from '#react/components/assets-panel/assets'
import { AssetThumbnail } from '#react/components/assets-panel/AssetThumbnail'
import { FloatingMenu } from '#react/components/properties/variables/FloatingMenu'
import { AppInput } from '#react/components/ui/AppInput'
import { AppPlaceholder } from '#react/components/ui/AppPlaceholder'
import { IconButton } from '#react/components/ui/IconButton'
import { useMenuUI } from '#react/components/ui/menu'
import { SegmentedControl } from '#react/components/ui/SegmentedControl'
import { ASSET_GRID_THUMBNAIL_SIZE, ASSET_LIST_THUMBNAIL_SIZE } from '#react/constants'
import { getLib } from '#react/graph/remote-lib'
import { useI18n } from '#react/i18n'
import { useOverlayScrollbar } from '#react/internal/overlay-scrollbar/use'
import { libraryAPI, type RemoteLibraryCatalogItem } from '#react/lib/client'
import { BookOpen, ChevronDown, ChevronLeft, Component, LayoutGrid, List, Plus } from 'lucide-react'
import { useMemo, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { useParams } from 'react-router-dom'

type AssetView = 'grid' | 'list'

export function AssetsPanel() {
  const store = useEditorStore()
  const { fileKey } = useParams<{ fileKey?: string }>()
  const { panels, commands } = useI18n()
  const contextMenu = useMenuUI({ content: 'min-w-44' })
  const [query, setQuery] = useState('')
  const [assetView, setAssetView] = useState<AssetView>('grid')
  const [activeLibKey, setActiveLibKey] = useState<string | undefined>(undefined)
  const [slideEnabled, setSlideEnabled] = useState(false)
  const [collapsedPages, setCollapsedPages] = useState<Set<string>>(() => new Set())
  const [libRevision, setLibRevision] = useState(0)
  const [detailsAssetId, setDetailsAssetId] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ assetId: string; x: number; y: number } | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [catalog, setCatalog] = useState<RemoteLibraryCatalogItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const librariesScrollRef = useOverlayScrollbar<HTMLDivElement>()
  const assetsScrollRef = useOverlayScrollbar<HTMLDivElement>()

  const libraries = useMemo(
    () => listAssetLibraries(store.graph, panels.createdInThisFile, panels.builtinLibrary),
    [
      libRevision,
      panels.builtinLibrary,
      panels.createdInThisFile,
      store.graph,
      store.state.sceneVersion
    ]
  )
  const activeLib = libraries.find((lib) => lib.key === activeLibKey) ?? null
  const sourceLibraryKey = activeLib?.remote ? activeLib.key : undefined
  const activeGraph = sourceLibraryKey
    ? (getLib(store.graph, sourceLibraryKey)?.graph ?? store.graph)
    : store.graph

  const assets = useMemo(
    () => (activeLibKey ? listAssets(store, activeGraph, panels.page) : []),
    [activeGraph, activeLibKey, panels.page, store, store.state.sceneVersion]
  )
  const filteredAssets = useMemo(() => filterAssets(assets, query), [assets, query])
  const assetGroups = useMemo(() => groupAssets(filteredAssets), [filteredAssets])
  const detailsAsset = assets.find((asset) => asset.id === detailsAssetId) ?? null
  const viewOptions = [
    { value: 'grid', label: panels.gridView },
    { value: 'list', label: panels.listView }
  ]

  function openLibrary(key: string) {
    setSlideEnabled(true)
    setActiveLibKey(key)
  }

  function closeLibrary() {
    setSlideEnabled(true)
    setQuery('')
    setActiveLibKey('')
  }

  function togglePageGroup(pageId: string) {
    setCollapsedPages((current) => {
      const next = new Set(current)
      if (next.has(pageId)) next.delete(pageId)
      else next.add(pageId)
      return next
    })
  }

  function refreshLibraries() {
    setLibRevision((value) => value + 1)
    store.notify()
  }

  async function openAddLibraries() {
    setAddOpen(true)
    setCatalogLoading(true)
    try {
      const res = await libraryAPI.list()
      setCatalog(Array.isArray(res.data) ? res.data : [])
    } catch {
      setCatalog([])
    } finally {
      setCatalogLoading(false)
    }
  }

  async function onSelectCatalogItem(item: RemoteLibraryCatalogItem) {
    await attachRemoteLibrary(store, fileKey, item)
    refreshLibraries()
    setAddOpen(false)
  }

  function onDragStart(event: DragEvent<HTMLDivElement>, asset: LocalAsset) {
    if (!event.dataTransfer || !asset.componentId) return
    event.dataTransfer.setData(COMPONENT_MIME, asset.componentId)
    if (sourceLibraryKey) event.dataTransfer.setData(COMPONENT_LIB_MIME, sourceLibraryKey)
    event.dataTransfer.effectAllowed = 'copy'
  }

  function onAssetKeydown(event: KeyboardEvent<HTMLDivElement>, asset: LocalAsset) {
    if ((event.metaKey || event.ctrlKey) && event.code === 'Enter') {
      event.preventDefault()
      setDetailsAssetId(asset.id)
      return
    }
    if (event.code === 'Enter' || event.code === 'Space') {
      event.preventDefault()
      insertAssetInstance(store, asset, sourceLibraryKey)
    }
  }

  function onContextMenu(event: MouseEvent<HTMLDivElement>, asset: LocalAsset) {
    event.preventDefault()
    setMenu({ assetId: asset.id, x: event.clientX, y: event.clientY })
  }

  const menuAsset = assets.find((asset) => asset.id === menu?.assetId) ?? null
  const browsingLibrary = Boolean(activeLibKey)
  const paneTransition = slideEnabled ? 'transform 220ms ease-out' : undefined

  return (
    <section data-test-id="assets-panel" className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className="absolute inset-0 flex flex-col"
          style={{
            transform: browsingLibrary ? 'translateX(-100%)' : 'translateX(0)',
            transition: paneTransition,
            pointerEvents: browsingLibrary ? 'none' : 'auto'
          }}
          aria-hidden={browsingLibrary || undefined}
        >
          <div
            ref={librariesScrollRef}
            className="scrollbar-overlay min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-2"
          >
            <div className="space-y-1">
              {libraries.map((libItem) => (
                <button
                  key={libItem.key}
                  type="button"
                  data-test-id="assets-lib-item"
                  data-lib-key={libItem.key}
                  className="flex w-full cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 text-left text-xs text-surface hover:bg-hover"
                  onClick={() => openLibrary(libItem.key)}
                >
                  {libItem.remote ? (
                    <AssetRemoteThumbnail
                      nodeId={getLib(store.graph, libItem.key)?.graph.getPages()[0]?.id ?? ''}
                      remoteKey={libItem.key}
                      alt={`${libItem.name} preview`}
                      size={ASSET_LIST_THUMBNAIL_SIZE}
                    />
                  ) : (
                    <AssetThumbnail
                      nodeId={store.state.currentPageId}
                      alt={`${libItem.name} preview`}
                      size={ASSET_LIST_THUMBNAIL_SIZE}
                    />
                  )}
                  <span className="truncate">{libItem.name}</span>
                </button>
              ))}
              <button
                type="button"
                data-test-id="assets-add-libraries"
                className="mt-4 flex h-7 w-full cursor-pointer items-center justify-center rounded border border-border bg-transparent text-xs text-muted hover:bg-hover hover:text-surface"
                onClick={() => void openAddLibraries()}
              >
                {panels.addMoreLibraries}
              </button>
            </div>
          </div>
        </div>

        <div
          className="absolute inset-0 flex flex-col"
          style={{
            transform: browsingLibrary ? 'translateX(0)' : 'translateX(100%)',
            transition: paneTransition,
            pointerEvents: browsingLibrary ? 'auto' : 'none'
          }}
          aria-hidden={!browsingLibrary || undefined}
        >
          {activeLibKey ? (
            <div className="flex shrink-0 items-center gap-2 px-2 py-2">
              <AppInput
                type="search"
                data-test-id="assets-search"
                size="sm"
                className="min-w-0 flex-1"
                placeholder={panels.searchLocalComponents}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div data-test-id="assets-view-toggle">
                <SegmentedControl
                  value={assetView}
                  options={viewOptions}
                  label={panels.assetView}
                  ui={{ root: 'w-16', item: 'px-1' }}
                  onChange={(value) => {
                    if (value === 'grid' || value === 'list') setAssetView(value)
                  }}
                  renderOption={(option) =>
                    option.value === 'grid' ? (
                      <LayoutGrid className="size-3" />
                    ) : (
                      <List className="size-3" />
                    )
                  }
                />
              </div>
            </div>
          ) : null}

          {activeLib ? (
            <div className="mb-1 inline-flex items-center px-2 py-2">
              <button
                type="button"
                data-test-id="assets-lib-back"
                className="cursor-pointer border-none bg-transparent p-0 text-surface"
                onClick={closeLibrary}
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="truncate text-xs text-surface">{activeLib.name}</span>
            </div>
          ) : null}

          <div
            ref={assetsScrollRef}
            className="scrollbar-overlay flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-2"
          >
            {activeLibKey
              ? assetGroups.map((group) => {
                  const collapsed = collapsedPages.has(group.pageId)
                  return (
                    <section
                      key={group.pageId || 'ungrouped'}
                      data-test-id="asset-group"
                      className="mb-3"
                    >
                      {group.pageName ? (
                        <button
                          type="button"
                          data-test-id="asset-group-toggle"
                          aria-expanded={!collapsed}
                          className="mb-1 flex w-full cursor-pointer items-center gap-1 border-none bg-transparent px-1 text-left"
                          onClick={() => togglePageGroup(group.pageId)}
                        >
                          <ChevronDown
                            className={`size-3 shrink-0 text-muted ${collapsed ? '-rotate-90' : ''}`}
                            aria-hidden="true"
                          />
                          <h2 className="text-[10px] font-medium tracking-wide text-muted uppercase">
                            {group.pageName}
                          </h2>
                        </button>
                      ) : null}
                      {collapsed && group.pageName ? null : (
                        <div
                          className={
                            assetView === 'grid'
                              ? 'grid grid-cols-2 gap-2'
                              : 'flex flex-col gap-0.5'
                          }
                        >
                          {group.assets.map((asset) => {
                            const Icon = nodeIcon(asset.node)
                            return (
                              <div
                                key={asset.id}
                                role="button"
                                tabIndex={0}
                                data-test-id="asset-item"
                                data-asset-id={asset.id}
                                draggable={Boolean(asset.componentId)}
                                className={`group/asset rounded text-left text-xs text-surface outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-accent ${
                                  assetView === 'grid'
                                    ? 'flex min-w-0 flex-col items-center gap-1 p-1.5'
                                    : 'flex w-full items-center gap-2 px-1.5 py-1'
                                }`}
                                onClick={() => setDetailsAssetId(asset.id)}
                                onKeyDown={(event) => onAssetKeydown(event, asset)}
                                onContextMenu={(event) => onContextMenu(event, asset)}
                                onDragStart={(event) => onDragStart(event, asset)}
                              >
                                {asset.componentId && sourceLibraryKey ? (
                                  <AssetRemoteThumbnail
                                    nodeId={asset.componentId}
                                    remoteKey={sourceLibraryKey}
                                    alt={`${asset.name} preview`}
                                    size={
                                      assetView === 'grid'
                                        ? ASSET_GRID_THUMBNAIL_SIZE
                                        : ASSET_LIST_THUMBNAIL_SIZE
                                    }
                                  />
                                ) : asset.componentId ? (
                                  <AssetThumbnail
                                    nodeId={asset.componentId}
                                    alt={`${asset.name} preview`}
                                    size={
                                      assetView === 'grid'
                                        ? ASSET_GRID_THUMBNAIL_SIZE
                                        : ASSET_LIST_THUMBNAIL_SIZE
                                    }
                                  />
                                ) : (
                                  <Icon
                                    className="size-4 shrink-0 text-component"
                                    aria-hidden="true"
                                  />
                                )}
                                <span
                                  className={
                                    assetView === 'grid' ? 'w-full min-w-0' : 'min-w-0 flex-1'
                                  }
                                >
                                  <span className="flex min-w-0 items-center gap-1">
                                    <span data-test-id="asset-name" className="truncate">
                                      {asset.name}
                                    </span>
                                    {asset.sourceLibraryKey ? (
                                      <span
                                        data-test-id="asset-library-badge"
                                        className="shrink-0 rounded bg-component/15 px-1 py-px text-[9px] font-medium text-component uppercase"
                                      >
                                        {panels.assetLibraryBadge}
                                      </span>
                                    ) : null}
                                  </span>
                                  {assetView === 'list' && asset.variants.length > 0 ? (
                                    <span
                                      data-test-id="asset-variant-summary"
                                      className="mt-0.5 block truncate text-[10px] text-muted"
                                    >
                                      {panels.assetVariantSummary({
                                        count: asset.variantCount,
                                        names: asset.variants
                                          .map((variant) => variant.name)
                                          .join(', ')
                                      })}
                                    </span>
                                  ) : null}
                                  {assetView === 'list' && asset.description ? (
                                    <span
                                      data-test-id="asset-description"
                                      className="mt-0.5 block truncate text-[10px] text-muted"
                                    >
                                      {asset.description}
                                    </span>
                                  ) : null}
                                  {assetView === 'list' && asset.hasConflicts ? (
                                    <span
                                      data-test-id="asset-variant-conflict"
                                      className="mt-0.5 block truncate text-[10px] text-[var(--color-warning-text)]"
                                    >
                                      {panels.duplicateVariantValues}
                                    </span>
                                  ) : null}
                                </span>
                                {assetView === 'list' ? (
                                  <div className="flex shrink-0 items-center">
                                    {asset.docsURL ? (
                                      <IconButton
                                        label={panels.openDocumentation}
                                        data-test-id="asset-docs"
                                        size="xs"
                                        onPointerDown={(event) => event.stopPropagation()}
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          if (asset.docsURL) openExternalLink(asset.docsURL)
                                        }}
                                      >
                                        <BookOpen className="size-3" />
                                      </IconButton>
                                    ) : null}
                                    <IconButton
                                      label={commands.createInstance}
                                      data-test-id="asset-insert"
                                      size="xs"
                                      onPointerDown={(event) => event.stopPropagation()}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        insertAssetInstance(store, asset, sourceLibraryKey)
                                      }}
                                    >
                                      <Plus className="size-3" />
                                    </IconButton>
                                  </div>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </section>
                  )
                })
              : null}

            {activeLibKey && filteredAssets.length === 0 ? (
              <AppPlaceholder
                data-test-id="assets-empty"
                label={panels.noLocalComponents}
                size="compact"
                icon={<Component className="size-4" />}
              />
            ) : null}
          </div>
        </div>
      </div>

      <FloatingMenu
        open={Boolean(menu && menuAsset)}
        point={menu ? { x: menu.x, y: menu.y } : undefined}
        onClose={() => setMenu(null)}
        className={contextMenu.content}
      >
        {menuAsset ? (
          <>
            <button
              type="button"
              data-test-id="asset-context-go-to-main"
              className={contextMenu.item}
              onClick={() => {
                void store.focusComponent(menuAsset.id)
                setMenu(null)
              }}
            >
              {panels.goToMainComponent}
            </button>
            <button
              type="button"
              data-test-id="asset-context-view-details"
              className={contextMenu.item}
              onClick={() => {
                setDetailsAssetId(menuAsset.id)
                setMenu(null)
              }}
            >
              {panels.viewDetails}
            </button>
          </>
        ) : null}
      </FloatingMenu>

      {detailsAsset ? (
        <AssetDetailsDialog
          asset={detailsAsset}
          libraryKey={sourceLibraryKey}
          onClose={() => setDetailsAssetId(null)}
        />
      ) : null}

      {addOpen ? (
        <AddLibraryDialog
          items={catalog}
          loading={catalogLoading}
          onClose={() => setAddOpen(false)}
          onSelect={(item) => void onSelectCatalogItem(item)}
        />
      ) : null}
    </section>
  )
}
