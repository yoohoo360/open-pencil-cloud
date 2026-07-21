import { defineComponentMetaLoader } from '#docs/sdk/component-meta'

const sources = [
  'packages/react/src/primitives/BindableValue/BindableValueRoot.vue',
  'packages/react/src/primitives/BindableValue/BindableValueTrigger.vue',
  'packages/react/src/primitives/BindableValue/BindableValuePicker.vue'
]

export default defineComponentMetaLoader(sources)
