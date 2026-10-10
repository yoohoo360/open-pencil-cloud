import type { EditorStore } from '#react/app/editor/store'
import { useSyncExternalStore } from 'react'

/** Pan/zoom that updates every canvas frame so HTML overlays track the scene. */
export function useOverlayViewport(store: EditorStore): {
  panX: number
  panY: number
  zoom: number
} {
  const frame = useSyncExternalStore(
    (onStoreChange) => {
      const unsubStore = store.subscribe(onStoreChange)
      const stops = [
        store.onEditorEvent('render:requested', onStoreChange),
        store.onEditorEvent('viewport:changed', onStoreChange)
      ]
      return () => {
        unsubStore()
        for (const stop of stops) stop()
      }
    },
    () =>
      `${store.state.panX}:${store.state.panY}:${store.state.zoom}:${store.state.sceneVersion}:${store.state.renderVersion}`,
    () => '0:0:1:0:0'
  )
  void frame
  return {
    panX: store.state.panX,
    panY: store.state.panY,
    zoom: store.state.zoom
  }
}
