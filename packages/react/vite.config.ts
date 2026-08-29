import { resolve } from 'node:path'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'

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
    id.startsWith('canvaskit-wasm/')
  )
}

export default defineConfig({
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
    react()
  ],
  resolve: {
    alias: {
      '@open-pencil/react': resolve(__dirname, 'src/index.ts'),
      '#react': resolve(__dirname, 'src')
    }
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
})
