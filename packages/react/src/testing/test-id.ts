export type TestId = string

export function toolbarToolTestId(tool: string, mobile = false): TestId {
  return `${mobile ? 'mobile-' : ''}toolbar-tool-${tool.toLowerCase()}`
}

export function toolbarFlyoutTestId(tool: string, mobile = false): TestId {
  return `${mobile ? 'mobile-' : ''}toolbar-flyout-${tool.toLowerCase()}`
}

export function toolbarFlyoutItemTestId(tool: string, mobile = false): TestId {
  return `${mobile ? 'mobile-' : ''}toolbar-flyout-item-${tool.toLowerCase()}`
}

export function variablesAddTestId(type: string): TestId {
  return `variables-add-${type.toLowerCase()}`
}
