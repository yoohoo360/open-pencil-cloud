import { onMounted, ref } from 'vue'

import type { AttachmentPresentation } from '@/app/ai/attachment/presentation/types'

export function useAttachments() {
  const presentations = ref<Record<string, { attachments: AttachmentPresentation[] }>>({})
  onMounted(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 160
    canvas.height = 100
    const context = canvas.getContext('2d')
    if (!context) return
    context.fillStyle = '#fef3c7'
    context.fillRect(0, 0, 160, 100)
    context.fillStyle = '#9747ff'
    context.fillRect(12, 12, 40, 24)
    context.fillRect(60, 12, 40, 24)
    context.fillRect(108, 12, 40, 24)
    canvas.toBlob((preview) => {
      if (!preview) return
      presentations.value = {
        request: {
          attachments: [
            {
              id: 'reference',
              messageId: 'request',
              kind: 'image',
              name: 'reference.png',
              mediaType: 'image/png',
              originalSize: { x: 160, y: 100 },
              preview
            },
            {
              id: 'frame',
              messageId: 'request',
              kind: 'node',
              name: 'Dashboard frame',
              nodeId: 'preview-frame',
              nodeType: 'FRAME',
              originalSize: { x: 160, y: 100 },
              preview
            }
          ]
        }
      }
    }, 'image/png')
  })
  return presentations
}
