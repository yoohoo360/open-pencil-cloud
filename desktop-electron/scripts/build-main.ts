import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(root, '..')
const dist = join(packageRoot, 'dist')
mkdirSync(dist, { recursive: true })

const shared = {
  outdir: dist,
  target: 'node' as const,
  external: ['electron'],
  sourcemap: 'inline' as const
}

await Bun.build({
  ...shared,
  entrypoints: [join(packageRoot, 'src/main.ts')],
  format: 'esm',
  naming: 'main.js'
})

await Bun.build({
  ...shared,
  entrypoints: [join(packageRoot, 'src/preload.ts')],
  format: 'cjs',
  naming: 'preload.cjs'
})

console.log('[desktop-electron] built dist/main.js and dist/preload.cjs')
