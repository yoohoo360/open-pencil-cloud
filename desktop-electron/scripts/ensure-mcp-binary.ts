#!/usr/bin/env bun
import { spawnSync } from 'node:child_process'
import { access, mkdir, readFile, rename, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { BunPlugin } from 'bun'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(packageRoot, '..')
const binariesDir = join(packageRoot, 'binaries')

function hostTargetTriple(): string {
  const platform =
    process.platform === 'darwin'
      ? 'apple-darwin'
      : process.platform === 'win32'
        ? 'pc-windows-msvc'
        : 'unknown-linux-gnu'
  const arch = process.arch === 'arm64' ? 'aarch64' : process.arch === 'x64' ? 'x86_64' : process.arch
  return `${arch}-${platform}`
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const extension = process.platform === 'win32' ? '.exe' : ''
const targetName = `openpencil-mcp-http-${hostTargetTriple()}${extension}`
const targetPath = join(binariesDir, targetName)

if (await exists(targetPath) && process.env.OPENPENCIL_REBUILD_MCP !== '1') {
  console.log(`[mcp-binary] using ${targetPath}`)
  process.exit(0)
}

const entry = join(repoRoot, 'packages/mcp/src/index.ts')
if (!(await exists(entry))) {
  console.error(`[mcp-binary] missing ${entry}; cannot compile openpencil-mcp-http`)
  process.exit(1)
}

await mkdir(binariesDir, { recursive: true })
const staging = join(binariesDir, `openpencil-mcp-http${extension}`)
const bundleDir = join(binariesDir, '.mcp-bundle')
const rawTextPlugin: BunPlugin = {
  name: 'raw-text',
  setup(build) {
    build.onResolve({ filter: /\?raw$/ }, ({ importer, path }) => ({
      namespace: 'raw-text',
      path: resolve(dirname(importer), path.slice(0, -'?raw'.length))
    }))
    build.onLoad({ filter: /.*/, namespace: 'raw-text' }, async ({ path }) => ({
      contents: await readFile(path, 'utf8'),
      loader: 'text'
    }))
    build.onLoad({ filter: /css-tree[\\/]lib[\\/]data(?:-patch)?\.js$/ }, async ({ path }) => {
      const source = await readFile(path, 'utf8')
      return {
        contents: source
          .replace("import { createRequire } from 'module';", '')
          .replace('const require = createRequire(import.meta.url);', '')
          .replace(
            /const (\w+) = require\((['"])([^'"]+\.json)\2\);/g,
            "import $1 from '$3';"
          ),
        loader: 'js'
      }
    })
  }
}

console.log(`[mcp-binary] compiling ${targetName}…`)
await rm(bundleDir, { recursive: true, force: true })
const bundle = await Bun.build({
  entrypoints: [entry],
  outdir: bundleDir,
  target: 'bun',
  plugins: [rawTextPlugin]
})
if (!bundle.success) {
  for (const log of bundle.logs) console.error(log)
  console.error('[mcp-binary] Bun bundle failed')
  process.exit(1)
}

const bundledEntry = bundle.outputs.find((output) => output.kind === 'entry-point')?.path
if (!bundledEntry) {
  console.error('[mcp-binary] Bun bundle did not produce an entry point')
  process.exit(1)
}
const compile = spawnSync('bun', ['build', '--compile', '--outfile', staging, bundledEntry], {
  cwd: bundleDir,
  stdio: 'inherit'
})
await rm(bundleDir, { recursive: true, force: true })
if (compile.status !== 0) {
  console.error('[mcp-binary] bun build --compile failed')
  process.exit(compile.status ?? 1)
}
await rename(staging, targetPath)
console.log(`[mcp-binary] wrote ${targetPath}`)
