import type { EditorCommandMapOptions } from './context'
import type { EditorCommand } from './types'

export function createViewCommands({
  editor,
  capabilities,
  messages: t
}: EditorCommandMapOptions): Pick<
  Record<'view.zoom100' | 'view.zoomFit' | 'view.zoomSelection', EditorCommand>,
  'view.zoom100' | 'view.zoomFit' | 'view.zoomSelection'
> {
  return {
    'view.zoom100': {
      id: 'view.zoom100',
      get label() {
        return t.zoomTo100
      },
      enabled: true,
      run: () => editor.zoomTo100()
    },
    'view.zoomFit': {
      id: 'view.zoomFit',
      get label() {
        return t.zoomToFit
      },
      enabled: true,
      run: () => editor.zoomToFit()
    },
    'view.zoomSelection': {
      id: 'view.zoomSelection',
      get label() {
        return t.zoomToSelection
      },
      enabled: capabilities.canZoomToSelection,
      run: () => editor.zoomToSelection()
    }
  }
}
