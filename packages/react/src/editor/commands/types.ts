import type { ReactComponent } from '#react/shared/react-types'

export type EditorCommandId =
  | 'edit.undo'
  | 'edit.redo'
  | 'selection.selectAll'
  | 'selection.duplicate'
  | 'selection.delete'
  | 'selection.group'
  | 'selection.frameSelection'
  | 'selection.ungroup'
  | 'selection.createComponent'
  | 'selection.createComponentSet'
  | 'selection.createInstance'
  | 'selection.detachInstance'
  | 'selection.goToMainComponent'
  | 'selection.wrapInAutoLayout'
  | 'selection.toggleMask'
  | 'selection.bringToFront'
  | 'selection.sendToBack'
  | 'selection.toggleVisibility'
  | 'selection.toggleLock'
  | 'selection.flipHorizontal'
  | 'selection.flipVertical'
  | 'selection.booleanUnion'
  | 'selection.booleanSubtract'
  | 'selection.booleanIntersect'
  | 'selection.booleanExclude'
  | 'selection.flatten'
  | 'selection.outlineText'
  | 'selection.outlineStroke'
  | 'selection.moveToPage'
  | 'selection.setOpacity'
  | 'view.zoom100'
  | 'view.zoomFit'
  | 'view.zoomSelection'

export interface EditorCommand {
  id: EditorCommandId
  label: string
  enabled: boolean
  run: () => void
}

export interface EditorCommandMenuItem {
  id?: EditorCommandId
  label: string
  shortcut?: string
  action?: () => void
  disabled?: boolean
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  icon?: ReactComponent
}

export interface EditorCommandMenuSeparator {
  separator: true
}

export type EditorCommandMenuEntry = EditorCommandMenuItem | EditorCommandMenuSeparator
