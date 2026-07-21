import { defineComponentMetaLoader } from '#docs/sdk/component-meta'

const sources = [
  'packages/react/src/primitives/SegmentedControl/SegmentedControlRoot.vue',
  'packages/react/src/primitives/SegmentedControl/SegmentedControlItem.vue'
]

export default defineComponentMetaLoader(sources)
