/**
 * Package an installable OpenPencil Electron build (dmg / nsis / AppImage).
 *
 *   bun run build           # platform installer(s)
 *   bun run build -- --dir  # unpacked app dir only (faster)
 */
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const passthrough = process.argv.slice(2)

function run(cmd: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: packageRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        // Packaged shell defaults to the prod frontend URL.
        OPENPENCIL_APP_ENV: process.env.OPENPENCIL_APP_ENV ?? 'prod',
        CSC_IDENTITY_AUTO_DISCOVERY: process.env.CSC_IDENTITY_AUTO_DISCOVERY ?? 'false'
      }
    })
    child.on('error', reject)
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

const menuCode = await run('bun', ['run', 'generate:menu'])
if (menuCode !== 0) process.exit(menuCode)

const mainCode = await run('bun', ['run', 'build:main'])
if (mainCode !== 0) process.exit(mainCode)

const builderArgs = ['electron-builder', '--config', 'electron-builder.yml', ...passthrough]
const buildCode = await run('bunx', builderArgs)
process.exit(buildCode)
