import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const workbox = {
  maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
  globPatterns: ['**/*.{js,css,html,wasm,png,ico,ttf,webmanifest}'],
  navigateFallback: '/index.html'
}

const manifest = {
  name: 'OpenPencil',
  short_name: 'OpenPencil',
  description: 'Open-source design editor',
  display: 'standalone',
  orientation: 'any',
  start_url: '/',
  scope: '/',
  theme_color: '#1e1e1e',
  background_color: '#1e1e1e',
  categories: ['design', 'productivity'],
  icons: [
    { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}

export function openPencilPwaRspackPlugin() {
  return {
    apply(compiler: {
      options: { mode?: string; output?: { path?: string } }
      hooks: {
        afterEmit: {
          tapPromise: (name: string, fn: () => Promise<void>) => void
        }
      }
    }) {
      compiler.hooks.afterEmit.tapPromise('open-pencil-pwa', async () => {
        if (compiler.options.mode === 'development') return
        const outputPath = compiler.options.output?.path
        if (!outputPath) return
        await writeFile(
          join(outputPath, 'manifest.webmanifest'),
          `${JSON.stringify(manifest, null, 2)}\n`
        )
        const { generateSW } = await import('workbox-build')
        await generateSW({
          globDirectory: outputPath,
          globPatterns: workbox.globPatterns,
          swDest: join(outputPath, 'sw.js'),
          maximumFileSizeToCacheInBytes: workbox.maximumFileSizeToCacheInBytes,
          navigateFallback: workbox.navigateFallback
        })
      })
    }
  }
}
