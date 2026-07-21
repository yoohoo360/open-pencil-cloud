import { useState } from 'react'

import type { Fill } from '@open-pencil/scene-graph'

import { FillRoot } from '#react/primitives/Fill/FillRoot'
import { FillSwatch } from '#react/primitives/Fill/FillSwatch'

const solid: Fill = {
  type: 'SOLID',
  color: { r: 0.22, g: 0.48, b: 0.96, a: 1 },
  opacity: 1,
  visible: true
}

const transparent: Fill = { ...solid, color: { ...solid.color, a: 0.45 } }
const gradient: Fill = {
  ...solid,
  type: 'GRADIENT_LINEAR',
  gradientStops: [
    { color: { r: 0.55, g: 0.24, b: 0.98, a: 1 }, position: 0 },
    { color: { r: 0.08, g: 0.72, b: 0.65, a: 0.65 }, position: 1 }
  ]
}

export function ColorFillDemo() {
  const [editableFill, setEditableFill] = useState<Fill>(solid)
  return (
    <div className="w-full max-w-[560px] space-y-5 rounded-lg border p-5">
      <div className="flex gap-4">
        {([
          ['Solid', solid],
          ['Transparent', transparent],
          ['Gradient', gradient]
        ] as const).map(([name, fill]) => (
          <FillSwatch
            key={name}
            fill={fill}
            label={`${name} fill`}
            className="relative size-10 overflow-hidden rounded-md border"
          >
            {({ background }) => <span className="absolute inset-0" style={{ background }} />}
          </FillSwatch>
        ))}
      </div>
      <FillRoot fill={editableFill} onUpdate={setEditableFill}>
        {({ actions, swatchBackground }) => (
          <div className="flex items-center gap-2">
            <span className="size-8 rounded border" style={{ background: swatchBackground }} />
            <button type="button" onClick={actions.toSolid}>Solid</button>
            <button type="button" onClick={actions.toGradient}>Gradient</button>
            <button type="button" onClick={actions.toImage}>Image</button>
          </div>
        )}
      </FillRoot>
    </div>
  )
}
