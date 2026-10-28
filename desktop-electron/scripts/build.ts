/**
 * Package an installable OpenPencil Electron build (dmg / nsis / AppImage).
 *
 * Stages a minimal app outside the Bun workspace (os.tmpdir) so electron-builder
 * cannot walk up into the monorepo and pack root `node_modules` (~700MB).
 *
 *   bun run build           # platform installer(s)
 *   bun run build:dir       # unpacked app dir only (faster)
 */
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const stageRoot = join(tmpdir(), 'open-pencil-electron-stage')
const passthrough = process.argv.slice(2)

function run(
  cmd: string,
  args: string[],
  cwd: string,
  env: Record<string, string | undefined> = {}
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: 'inherit',
      env: {
        ...process.env,
        CSC_IDENTITY_AUTO_DISCOVERY: process.env.CSC_IDENTITY_AUTO_DISCOVERY ?? 'false',
        ...env
      }
    })
    child.on('error', reject)
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

/** Packaging channel: local | dev | prod (default prod for installers). */
const packEnv = (() => {
  const raw = process.env.OPENPENCIL_APP_ENV?.trim().toLowerCase()
  if (raw === 'local') return 'local'
  if (raw === 'dev' || raw === 'test') return 'dev'
  return 'prod'
})()

const mcpCode = await run('bun', ['run', 'ensure:mcp-binary'], packageRoot)
if (mcpCode !== 0) process.exit(mcpCode)

const mainCode = await run('bun', ['run', 'build:main'], packageRoot, {
  OPENPENCIL_PACKAGING: '1',
  OPENPENCIL_APP_ENV: packEnv
})
if (mainCode !== 0) process.exit(mainCode)
console.log(`[desktop-electron] packaging channel=${packEnv}`)

const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
  version: string
  productName?: string
  description?: string
  author?: string
}
const electronPkg = JSON.parse(
  readFileSync(join(packageRoot, 'node_modules/electron/package.json'), 'utf8')
) as { version: string }

rmSync(stageRoot, { recursive: true, force: true })
mkdirSync(stageRoot, { recursive: true })
writeFileSync(
  join(stageRoot, 'package.json'),
  `${JSON.stringify(
    {
      name: 'open-pencil',
      productName: pkg.productName ?? 'OpenPencil',
      version: pkg.version,
      description: pkg.description ?? 'OpenPencil',
      author: pkg.author ?? 'OpenPencil',
      private: true,
      type: 'module',
      main: 'dist/main.js',
      // DevDependency so builder resolves Electron without packing workspace deps.
      devDependencies: {
        electron: electronPkg.version
      }
    },
    null,
    2
  )}\n`
)
cpSync(join(packageRoot, 'dist'), join(stageRoot, 'dist'), { recursive: true })
cpSync(join(packageRoot, 'binaries'), join(stageRoot, 'binaries'), { recursive: true })

const icons = join(packageRoot, '../desktop-react/icons')
mkdirSync(join(stageRoot, 'build'), { recursive: true })
for (const name of ['icon.icns', 'icon.ico', '128x128.png', 'icon.png']) {
  try {
    cpSync(join(icons, name), join(stageRoot, 'build', name))
  } catch {
    // optional
  }
}

// Point electron-builder at the isolated stage; copy a self-contained config.
const stageConfig = join(stageRoot, 'electron-builder.yml')
writeFileSync(
  stageConfig,
  `appId: net.dannote.open-pencil.electron
productName: OpenPencil
copyright: Copyright © OpenPencil
artifactName: \${productName}-\${version}-\${os}-\${arch}.\${ext}
electronVersion: ${electronPkg.version}
directories:
  output: ${join(packageRoot, 'release').replaceAll('\\', '/')}
  buildResources: build
files:
  - dist/**/*
  - package.json
extraResources:
  - from: binaries
    to: binaries
asar: true
npmRebuild: false
nodeGypRebuild: false
extraMetadata:
  main: dist/main.js
mac:
  category: public.app-category.graphics-design
  icon: icon.icns
  target:
    - dmg
    - zip
  hardenedRuntime: false
dmg:
  title: OpenPencil
win:
  icon: icon.ico
  target:
    - nsis
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
linux:
  icon: 128x128.png
  category: Graphics
  target:
    - AppImage
    - deb
`
)

rmSync(join(packageRoot, 'release'), { recursive: true, force: true })

// Install electron into the stage so version resolution works without the monorepo.
const installCode = await run(
  'bun',
  ['install', '--no-save', '--backend=copyfile'],
  stageRoot
)
if (installCode !== 0) {
  // Fallback: copy electron package from the workspace install.
  mkdirSync(join(stageRoot, 'node_modules'), { recursive: true })
  cpSync(join(packageRoot, 'node_modules/electron'), join(stageRoot, 'node_modules/electron'), {
    recursive: true
  })
  // @electron/get and friends may be needed — prefer bun install success.
}

const builderArgs = ['electron-builder', '--config', 'electron-builder.yml', ...passthrough]
const buildCode = await run('bunx', builderArgs, stageRoot)
process.exit(buildCode)
