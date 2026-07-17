import { resolve } from 'path'
import { copyFileSync, existsSync, mkdirSync } from 'fs'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    {
      name: 'copy-canvaskit-wasm',
      buildStart() {
        const src = resolve(__dirname, '../../../node_modules/canvaskit-wasm/bin/canvaskit.wasm')
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
  server: {
    port: 3333
  }
})
