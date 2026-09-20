import { Frame, Text, renderTree } from '@open-pencil/core/design-jsx'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { createPaintGroups } from './samples'

export function createPaintSection(graph: SceneGraph, parentId: string) {
  const text = { font: 'Inter', color: '#172554' }
  const label = { ...text, size: 12, color: '#536487' }
  return renderTree(
    graph,
    Frame({
      name: 'Paint and effects',
      flex: 'col',
      w: 1056,
      h: 'hug',
      p: 32,
      gap: 32,
      bg: '#FFFFFF',
      children: [
        Text({ ...text, size: 20, weight: 600, children: 'Same shapes. Different possibilities.' }),
        ...createPaintGroups().map((group) =>
          Frame({
            name: group.title,
            flex: 'col',
            w: 'fill',
            h: 'hug',
            gap: 16,
            children: [
              Text({ ...label, children: group.title }),
              Frame({
                name: 'Editable comparisons',
                flex: 'row',
                w: 'fill',
                h: 'hug',
                gap: 24,
                children: group.examples.map((example) =>
                  Frame({
                    name: example.title,
                    flex: 'col',
                    w: 'fill',
                    h: 'hug',
                    gap: 8,
                    children: [
                      Frame({
                        name: `${example.title} / artwork`,
                        flex: 'row',
                        w: 'fill',
                        h: 'hug',
                        p: 16,
                        justify: 'center',
                        rounded: 12,
                        bg: '#EEF2FF',
                        children: example.artwork
                      }),
                      Text({ ...text, size: 14, weight: 600, children: example.title }),
                      Text({ ...label, w: 'fill', lineHeight: 18, children: example.caption })
                    ]
                  })
                )
              })
            ]
          })
        ),
        Text({
          ...label,
          w: 'fill',
          lineHeight: 18,
          children:
            'Select the actual shape or text layer to inspect its fills and effects. Every example stays editable.'
        })
      ]
    }),
    { parentId }
  )
}
