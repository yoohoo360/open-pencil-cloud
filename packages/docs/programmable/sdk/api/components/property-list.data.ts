import { defineComponentMetaLoader } from '#docs/sdk/component-meta'

const sources = [
  'packages/react/src/primitives/PropertyList/PropertyListRoot.vue',
  'packages/react/src/primitives/PropertyList/PropertyListItem.vue',
  'packages/react/src/primitives/PropertyList/PropertyListAdd.vue',
  'packages/react/src/primitives/PropertyList/PropertyListRemove.vue',
  'packages/react/src/primitives/PropertyList/PropertyListVisibility.vue'
]

export default defineComponentMetaLoader(sources)
