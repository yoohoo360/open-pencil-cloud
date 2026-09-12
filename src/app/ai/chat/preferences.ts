import { computed } from 'vue'

import { appPreferences, type ReasoningDisplay } from '@/app/settings/preferences/store'

export const reasoningDisplay = computed({
  get: () => appPreferences.value.chat.reasoningDisplay,
  set: (reasoningDisplay: ReasoningDisplay) => {
    appPreferences.value = { ...appPreferences.value, chat: { reasoningDisplay } }
  }
})
