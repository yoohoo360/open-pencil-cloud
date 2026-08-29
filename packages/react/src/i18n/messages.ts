import { commandMessageDefaults } from '#react/i18n/messages/commands'
import { dialogMessageDefaults } from '#react/i18n/messages/dialogs'
import { menuMessageDefaults } from '#react/i18n/messages/menu'
import { pageMessageDefaults } from '#react/i18n/messages/pages'
import { panelMessageDefaults } from '#react/i18n/messages/panels'
import { toolMessageDefaults } from '#react/i18n/messages/tools'
import { variableTypeMessageDefaults } from '#react/i18n/messages/variable-types'

export { menuMessages, menuMessageDefaults } from '#react/i18n/messages/menu'
export { commandMessages, commandMessageDefaults } from '#react/i18n/messages/commands'
export { toolMessages, toolMessageDefaults } from '#react/i18n/messages/tools'
export { panelMessages, panelMessageDefaults } from '#react/i18n/messages/panels'
export {
  variableTypeMessages,
  variableTypeMessageDefaults
} from '#react/i18n/messages/variable-types'
export { pageMessages, pageMessageDefaults } from '#react/i18n/messages/pages'
export { dialogMessages, dialogMessageDefaults } from '#react/i18n/messages/dialogs'

export const messageDefaults = {
  menu: menuMessageDefaults,
  commands: commandMessageDefaults,
  tools: toolMessageDefaults,
  panels: panelMessageDefaults,
  variableTypes: variableTypeMessageDefaults,
  pages: pageMessageDefaults,
  dialogs: dialogMessageDefaults
} as const
