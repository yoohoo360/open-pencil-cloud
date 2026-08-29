import type { EditorCommandId } from '#react/editor/commands/types'
import type { TestId } from '#react/testing/test-id'

export interface MenuActionNode {
  separator?: false
  id?: EditorCommandId
  label: string
  shortcut?: string
  action?: () => void
  disabled?: boolean
  testId?: TestId
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  sub?: MenuEntry[]
}

export interface MenuSeparatorNode {
  separator: true
}

export type MenuEntry = MenuActionNode | MenuSeparatorNode
