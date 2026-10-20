import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(root, '..')
const dist = join(packageRoot, 'dist')
mkdirSync(dist, { recursive: true })

const FRONTEND_URL_BY_ENV = {
  local: 'http://localhost:8000',
  dev: 'https://pencil.dev.yoohoo.cn',
  prod: 'https://pencil.yoohoo.cn'
} as const

function resolveBuildEnv(): keyof typeof FRONTEND_URL_BY_ENV {
  const raw = process.env.OPENPENCIL_APP_ENV?.trim().toLowerCase()
  if (raw === 'prod' || raw === 'production') return 'prod'
  if (raw === 'dev' || raw === 'test') return 'dev'
  if (raw === 'local') return 'local'
  // Packaging defaults to prod; plain `build:main` / `dev` defaults to local.
  if (process.env.OPENPENCIL_PACKAGING === '1') return 'prod'
  return 'local'
}

const appEnv = resolveBuildEnv()
const frontendUrl = process.env.OPENPENCIL_FRONTEND_URL?.trim() || FRONTEND_URL_BY_ENV[appEnv]
writeFileSync(
  join(dist, 'app-env.json'),
  `${JSON.stringify({ appEnv, frontendUrl }, null, 2)}\n`
)

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

console.log(
  `[desktop-electron] built dist/ (appEnv=${appEnv}, frontend=${frontendUrl})`
)