import { FigmaAPI } from '@open-pencil/core/figma-api'
import { IS_BROWSER } from '@open-pencil/core/constants'

import type { EditorStore } from '#react/app/editor/store'

export function makeFigmaFromStore(store: EditorStore): FigmaAPI {
  const api = new FigmaAPI(store.graph)
  api.setRenderer(store.renderer ?? null)
  api.currentPage = api.wrapNode(store.state.currentPageId)
  api.currentPage.selection = [...store.state.selectedIds]
    .map((id) => api.getNodeById(id))
    .filter((node): node is NonNullable<typeof node> => node !== null)
  const width = IS_BROWSER ? window.innerWidth : 1280
  const height = IS_BROWSER ? window.innerHeight : 800
  api.viewport = {
    center: {
      x: (-store.state.panX + width / 2) / store.state.zoom,
      y: (-store.state.panY + height / 2) / store.state.zoom
    },
    zoom: store.state.zoom
  }
  return api
}
