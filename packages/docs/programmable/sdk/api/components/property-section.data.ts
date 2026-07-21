import { defineComponentMetaLoader } from '#docs/sdk/component-meta'

const sources = [
  'packages/react/src/primitives/PropertySection/PropertySectionRoot.vue',
  'packages/react/src/primitives/PropertySection/PropertySectionHeader.vue',
  'packages/react/src/primitives/PropertySection/PropertySectionTitle.vue',
  'packages/react/src/primitives/PropertySection/PropertySectionActions.vue',
  'packages/react/src/primitives/PropertySection/PropertySectionContent.vue',
  'packages/react/src/primitives/PropertySection/PropertySectionEmptyAction.vue'
]

export default defineComponentMetaLoader(sources)
