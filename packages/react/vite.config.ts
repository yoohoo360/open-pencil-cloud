import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function isExternal(id: string) {
  return (
    id === 'react' ||
    id === 'react-dom' ||
    id.startsWith('react/') ||
    id.startsWith('react-dom/') ||
    id.startsWith('@open-pencil/') ||
    id === 'canvaskit-wasm' ||
    id.startsWith('canvaskit-wasm/') ||
    id === 'nanostores' ||
    id.startsWith('nanostores/') ||
    id.startsWith('@nanostores/') ||
    id === 'lucide-react' ||
    id === 'tailwind-variants' ||
    id === 'tailwind-merge' ||
    id === 'react-resizable-panels'
  )
}

function workspaceSourceAliases() {
  const repoRoot = resolve(__dirname, '../..')
  return [
    {
      find: /^@open-pencil\/scene-graph$/,
      replacement: resolve(repoRoot, 'packages/scene-graph/src/index.ts')
    },
    { find: '@open-pencil/scene-graph', replacement: resolve(repoRoot, 'packages/scene-graph/src') },
    { find: /^@open-pencil\/pen$/, replacement: resolve(repoRoot, 'packages/pen/src/index.ts') },
    { find: '@open-pencil/pen', replacement: resolve(repoRoot, 'packages/pen/src') },
    { find: /^@open-pencil\/kiwi$/, replacement: resolve(repoRoot, 'packages/kiwi/src/index.ts') },
    { find: '@open-pencil/kiwi', replacement: resolve(repoRoot, 'packages/kiwi/src') },
    { find: /^@open-pencil\/fig$/, replacement: resolve(repoRoot, 'packages/fig/src/index.ts') },
    { find: '@open-pencil/fig', replacement: resolve(repoRoot, 'packages/fig/src') },
    { find: /^@open-pencil\/core$/, replacement: resolve(repoRoot, 'packages/core/src/index.ts') },
    { find: '@open-pencil/core', replacement: resolve(repoRoot, 'packages/core/src') }
  ]
}

export default defineConfig(({ command }) => ({
  root: __dirname,
  plugins: [
    {
      name: 'copy-canvaskit-wasm',
      buildStart() {
        const src = resolve(__dirname, '../../node_modules/canvaskit-wasm/bin/canvaskit.wasm')
        const destDir = resolve(__dirname, 'public')
        const dest = resolve(destDir, 'canvaskit.wasm')
        if (existsSync(src) && !existsSync(dest)) {
          mkdirSync(destDir, { recursive: true })
          copyFileSync(src, dest)
        }
      }
    },
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: [
      { find: '@open-pencil/react', replacement: resolve(__dirname, 'src/index.ts') },
      { find: '#react', replacement: resolve(__dirname, 'src') },
      ...(command === 'serve' ? workspaceSourceAliases() : [])
    ]
  },
  server: {
    port: 3334
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es']
    },
    sourcemap: true,
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      external: isExternal,
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js'
      }
    }
  }
}))
