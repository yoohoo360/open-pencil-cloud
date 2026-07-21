import { defineComponentMetaLoader } from '#docs/sdk/component-meta'

const sources = [
  'packages/react/src/primitives/NumberField/NumberFieldRoot.vue',
  'packages/react/src/primitives/NumberField/NumberFieldInput.vue',
  'packages/react/src/primitives/NumberField/NumberFieldValue.vue'
]

export default defineComponentMetaLoader(sources)
