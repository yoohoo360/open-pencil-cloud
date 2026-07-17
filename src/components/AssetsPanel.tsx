import { useState } from 'react'
import type { SceneNode } from '@open-pencil/scene-graph'
import { useI18n } from '@open-pencil/react'
import { nodeIcon } from '@/app/editor/icons'
import { useEditorStore } from '@/app/editor/active-store'
import { AppInput } from '@/components/ui/AppInput'
import { useButtonUI } from '@/components/ui/button'
import { Tip } from '@/components/ui/Tip'

type LocalAsset = {
  id: string; name: string; node: SceneNode; componentId: string | null
  variants: Array<{ name: string; values: string[] }>; variantCount: number
  hasConflicts: boolean; sourceLibraryKey: string | null; description: string; docsUrl: string | null
}

export default function AssetsPanel() {
  const editor = useEditorStore()
  const { panels, commands } = useI18n()
  const [query, setQuery] = useState('')
  const [_selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const insertButton = useButtonUI({ tone: 'ghost', size: 'iconSm' })

  function getAssets(): LocalAsset[] {
    const graph = editor.graph
    const assets: LocalAsset[] = []
    const page = graph.getNode(editor.state.currentPageId)
    if (!page) return assets
    for (const id of page.childIds) {
      const node = graph.getNode(id)
      if (!node) continue
      if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') continue
      assets.push({
        id: node.id, name: node.name, node, componentId: node.id,
        variants: [], variantCount: node.type === 'COMPONENT_SET' ? node.childIds.length : 0,
        hasConflicts: false, sourceLibraryKey: null, description: '', docsUrl: null
      })
    }
    return assets
  }

  const assets = getAssets()
  const filtered = assets.filter(a => !query || a.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div data-test-id="assets-panel" className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 gap-1 border-b border-border px-2 py-1.5">
        <AppInput
          value={query}
          placeholder={panels.searchAssets ?? 'Search assets'}
          size="sm"
          tone="panel"
          onChange={e => setQuery(e.target.value)}
          className="flex-1"
        />
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {filtered.map(asset => {
          const Icon = nodeIcon(asset.node)
          return (
            <div
              key={asset.id}
              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-hover"
              onClick={() => setSelectedAssetId(asset.id)}
            >
              <Icon className="size-3 shrink-0 text-component" />
              <span className="min-w-0 flex-1 truncate text-surface">{asset.name}</span>
              {asset.variantCount > 0 && (
                <span className="shrink-0 text-[10px] text-muted">{asset.variantCount}</span>
              )}
              <Tip label={commands.insertComponent ?? 'Insert'}>
                <button
                  type="button"
                  className={insertButton.base}
                  onClick={e => { e.stopPropagation(); editor.insertComponent(asset.id) }}
                >
                  <span className="text-base leading-none">+</span>
                </button>
              </Tip>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-xs text-muted">
            {query ? `No assets matching "${query}"` : panels.noLocalComponents ?? 'No local components'}
          </div>
        )}
      </div>
    </div>
  )
}
