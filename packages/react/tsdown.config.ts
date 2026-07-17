import { readFileSync } from 'node:fs'

import raw from 'unplugin-raw/rolldown'
import { defineConfig } from 'tsdown'
import type { Rolldown } from 'tsdown'

/** Match core's .md handling so re-exported editor barrels don't break the bundle. */
function rawText(): Rolldown.Plugin {
  return {
    name: 'raw-text',
    load(id) {
      if (id.endsWith('?raw')) {
        const path = id.slice(0, -'?raw'.length)
        return `export default ${JSON.stringify(readFileSync(path, 'utf8'))}`
      }
    },
    transform(code, id) {
      if (id.endsWith('.md')) {
        return { code: `export default ${JSON.stringify(code)}`, map: null }
      }
    }
  }
}

export default defineConfig({
  entry: {
    index: './src/index.ts'
  },
  platform: 'browser',
  format: ['esm'],
  dts: {
    sourcemap: true,
    resolver: 'tsc'
  },
  sourcemap: true,
  hash: false,
  clean: true,
  outDir: './dist',
  treeshake: {
    moduleSideEffects: false
  },
  deps: {
    neverBundle: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      /^react\//,
      '@open-pencil/core',
      /^@open-pencil\/core\//,
      '@open-pencil/scene-graph',
      /^@open-pencil\/scene-graph\//,
      'canvaskit-wasm',
      'opentype.js',
      '@nanostores/react',
      '@nanostores/i18n',
      'nanostores',
      '@tanstack/react-table',
      '@atlaskit/pragmatic-drag-and-drop',
      /^@atlaskit\/pragmatic-drag-and-drop\//,
      '@atlaskit/pragmatic-drag-and-drop-hitbox',
      /^@atlaskit\/pragmatic-drag-and-drop-hitbox\//
    ],
    onlyBundle: false
  },
  plugins: [rawText(), raw()],
  inputOptions: {
    preserveEntrySignatures: 'allow-extension',
    checks: {
      pluginTimings: false
    }
  },
  outputOptions: {
    minifyInternalExports: false
  }
})
