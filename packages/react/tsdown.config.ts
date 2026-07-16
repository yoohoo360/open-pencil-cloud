import raw from 'unplugin-raw/rolldown'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: './src/index.ts'
  },
  platform: 'neutral',
  format: ['esm'],
  dts: {
    sourcemap: true
  },
  sourcemap: true,
  hash: false,
  clean: true,
  outDir: './dist',
  treeshake: {
    moduleSideEffects: false
  },
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    '@open-pencil/core',
    /^@open-pencil\/core\//,
    'canvaskit-wasm',
    '@nanostores/react',
    '@nanostores/i18n',
    'nanostores',
    '@tanstack/react-table',
    '@atlaskit/pragmatic-drag-and-drop',
    /^@atlaskit\/pragmatic-drag-and-drop\//,
    '@atlaskit/pragmatic-drag-and-drop-hitbox',
    /^@atlaskit\/pragmatic-drag-and-drop-hitbox\//
  ],
  plugins: [raw()],
  inputOptions: {
    preserveEntrySignatures: 'allow-extension'
  },
  outputOptions: {
    minifyInternalExports: false
  }
})
