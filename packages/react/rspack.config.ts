import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

import { defineConfig } from '@rspack/cli'
import { rspack } from '@rspack/core'
import { ReactRefreshRspackPlugin } from '@rspack/plugin-react-refresh'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/rspack'
import Components from 'unplugin-vue-components/rspack'

import { devAutomationRoute } from '../../src/app/automation/bridge/portless-route'
import { AUTOMATION_HTTP_PORT } from '../core/src/constants'
import { localAutomationToken, openPencilAutomationRspackPlugin } from './rspack/automation'
import { openPencilPwaRspackPlugin } from './rspack/pwa'
import { tailwindcss, tailwindcssRule } from './rspack/tailwind'
import { openPencilViteIgnorePlugin } from './rspack/vite-ignore'

const isDev = process.env.NODE_ENV === 'development'
const isProd = process.env.APP_ENV === 'prod'
const lastCommitId = execSync('git log -1 --format=%H').toString().trim()
const host = process.env.TAURI_DEV_HOST
const command = isDev ? 'serve' : 'build'
const packageJson = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8')
) as {
  version: string
}
const automationRoute = devAutomationRoute(process.env.PORTLESS_URL, AUTOMATION_HTTP_PORT)
const automationPlugin = openPencilAutomationRspackPlugin(command, host)
const repoRoot = path.resolve(__dirname, '../..')
const reactSrc = path.resolve(__dirname, 'src')

const targets = ['chrome >= 87', 'edge >= 88', 'firefox >= 78', 'safari >= 14']

function swcLoader(refresh: boolean) {
  return {
    loader: 'builtin:swc-loader',
    options: {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true
        },
        transform: {
          react: {
            runtime: 'automatic',
            development: isDev,
            refresh: isDev && refresh
          }
        }
      },
      env: { targets }
    }
  }
}
function toOverride(request: string) {
  if (request.includes('.override.')) return null
  const match = /^(.*)\.(ts|tsx|js|jsx)$/.exec(request)
  if (!match) return null

  const candidate = `${match[1]}.override.${match[2]}`
  return existsSync(candidate) ? candidate : null
}

function workspaceSourceAliases() {
  const pkgSrc = (name: string) => path.resolve(repoRoot, 'packages', name, 'src')
  return {
    '@open-pencil/scene-graph$': path.join(pkgSrc('scene-graph'), 'index.ts'),
    '@open-pencil/scene-graph': pkgSrc('scene-graph'),
    '@open-pencil/pen$': path.join(pkgSrc('pen'), 'index.ts'),
    '@open-pencil/pen': pkgSrc('pen'),
    '@open-pencil/kiwi$': path.join(pkgSrc('kiwi'), 'index.ts'),
    '@open-pencil/kiwi': pkgSrc('kiwi'),
    '@open-pencil/fig$': path.join(pkgSrc('fig'), 'index.ts'),
    '@open-pencil/fig': pkgSrc('fig'),
    '@open-pencil/core$': path.join(pkgSrc('core'), 'index.ts'),
    '@open-pencil/core': pkgSrc('core'),
    '@open-pencil/dom-css/browser$': path.join(pkgSrc('dom-css'), 'browser.ts'),
    '@open-pencil/dom-css$': path.join(pkgSrc('dom-css'), 'index.ts'),
    '@open-pencil/dom-css': pkgSrc('dom-css')
  }
}

function resolveTsconfigPaths() {
  const tsconfig = JSON.parse(readFileSync(path.resolve(__dirname, 'tsconfig.json'), 'utf8'))
  const paths = tsconfig.compilerOptions?.paths || {}
  const aliases: Record<string, string> = {}

  for (const [key, value] of Object.entries(paths)) {
    const values = value as string[]
    if (!values?.[0]) continue

    const wildcard = key.endsWith('/*')
    const alias = key.replace(/\/\*$/, '')
    const target = values[0].replace(/\/\*$/, '')
    aliases[wildcard ? alias : `${alias}$`] = path.resolve(__dirname, target)
  }
  return aliases
}

export default defineConfig({
  context: __dirname,
  target: 'web',

  entry: {
    main: './src/main.tsx'
  },

  stats: {
    warnings: false
  },

  experiments: {
    css: true,
    nativeWatcher: isDev
  },

  output: {
    globalObject: 'self',
    filename: isDev ? '[name].js' : '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    assetModuleFilename: 'assets/[name].[hash][ext]',
    clean: true,
    publicPath: '/'
  },

  devtool: isProd ? false : 'cheap-source-map',

  externals: [
    (op: any, callback: any) => {
      const { request } = op
      if (request === 'canvaskit-wasm') {
        return callback(null, 'CanvasKitInit')
      }
      callback()
    }
  ],

  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json', '.css', '.less'],
    aliasFields: ['browser'],
    mainFields: ['browser', 'module', 'main'],
    conditionNames: ['bun', 'browser', 'import', 'module', 'default'],
    fallback: {
      fs: false,
      'fs/promises': false,
      path: false,
      url: false,
      http: false,
      https: false
    },
    alias: {
      ...resolveTsconfigPaths(),
      ...workspaceSourceAliases()
    }
  },

  module: {
    parser: {
      'css/auto': {
        namedExports: false,
        auto: true,
        localIdentName: '[name]__[local]___[hash:base64:5]'
      }
    },
    rules: [
      {
        resourceQuery: /raw/,
        type: 'asset/source'
      },
      {
        test: /\.ttf$/,
        type: 'asset/resource'
      },
      {
        test: /\.svg$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: { svgo: true }
          }
        ]
      },
      {
        test: /\.txt$/,
        type: 'asset/source'
      },
      {
        test: /\.(jsx?|tsx?)$/,
        include: reactSrc,
        use: [swcLoader(true)]
      },
      {
        test: /\.(jsx?|tsx?)$/,
        include: [path.join(repoRoot, 'packages'), path.join(repoRoot, 'src')],
        exclude: [reactSrc, /[\\/]node_modules[\\/]/, /[\\/]dist[\\/]/],
        use: [swcLoader(false)]
      },
      {
        test: /\.module\.(less|css)$/,
        type: 'css/auto',
        use: ['less-loader']
      },
      {
        test: /\.less$/,
        type: 'css/auto',
        use: ['less-loader']
      },
      tailwindcssRule
    ]
  },

  plugins: [
    new rspack.HtmlRspackPlugin({
      template: './public/index.html',
      minify: !isDev,
      templateParameters: {
        GIT_COMMIT_ID: lastCommitId
      }
    }),

    // new rspack.ProvidePlugin({}),

    isDev &&
      new ReactRefreshRspackPlugin({
        include: /[\\/]packages[\\/]react[\\/]src[\\/]/,
        exclude: /[\\/]node_modules[\\/]/
      }),
    openPencilViteIgnorePlugin(),
    new rspack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
      resource.request = resource.request.slice('node:'.length)
    }),
    new rspack.NormalModuleReplacementPlugin(/.*/, (resource: any) => {
      if (resource.request === '#core/design-jsx/render.js') {
        resource.request = '#core/design-jsx/render'
        return
      }

      const req = resource.request
      if (!req) return
      const override = toOverride(req)
      if (override) resource.request = override
    }),
    new rspack.DefinePlugin({
      'import.meta.env.DEV': JSON.stringify(isDev),
      'import.meta.env.PROD': JSON.stringify(!isDev),
      'import.meta.env.MODE': JSON.stringify(isDev ? 'development' : 'production'),
      'import.meta.env.APP_ENV': JSON.stringify(process.env.APP_ENV ?? ''),
      'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL ?? ''),
      'import.meta.env.VITE_COLLAB_WS_URL': JSON.stringify(process.env.VITE_COLLAB_WS_URL ?? ''),
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV ?? (isDev ? 'development' : 'production')
      ),
      'process.env.APP_ENV': JSON.stringify(process.env.APP_ENV ?? ''),
      'import.meta.env': `(${JSON.stringify({
        DEV: isDev,
        PROD: !isDev,
        MODE: isDev ? 'development' : 'production',
        APP_ENV: process.env.APP_ENV,
        NODE_ENV: process.env.NODE_ENV,
        VITE_API_URL: process.env.VITE_API_URL ?? '',
        VITE_COLLAB_WS_URL: process.env.VITE_COLLAB_WS_URL ?? ''
      })})`,
      __OPENPENCIL_APP_VERSION__: JSON.stringify(packageJson.version),
      __OPENPENCIL_LOCAL_AUTOMATION_TOKEN__: JSON.stringify(localAutomationToken(command)),
      __OPENPENCIL_LOCAL_AUTOMATION_URL__: JSON.stringify(automationRoute.browserURL),
      __OPENPENCIL_LOCAL_AUTOMATION_HTTP_URL__: JSON.stringify(
        automationRoute.browserURL.replace(/^ws/, 'http')
      )
    }),
    new rspack.EnvironmentPlugin({
      DEV: String(isDev),
      APP_ENV: process.env.APP_ENV,
      NODE_ENV: process.env.NODE_ENV,
      GIT_COMMIT_ID: lastCommitId
    }),
    new rspack.CopyRspackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, '../../node_modules/canvaskit-wasm/bin/canvaskit.wasm'),
          to: 'canvaskit.wasm',
          noErrorOnMissing: true
        },
        {
          from: path.resolve(__dirname, 'public'),
          to: '.',
          globOptions: { ignore: ['**/index.html'] }
        }
      ]
    }),
    tailwindcss(),
    Icons({ compiler: 'jsx', jsx: 'react' }),
    Components({ dts: false, resolvers: [IconsResolver({ prefix: 'icon' })] }),
    automationPlugin,
    openPencilPwaRspackPlugin()
  ].filter(Boolean),

  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    },
    usedExports: false,
    sideEffects: false,
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin(),
      new rspack.LightningCssMinimizerRspackPlugin({
        minimizerOptions: { targets }
      })
    ]
  },

  devServer: {
    port: 8080,
    hot: true,
    liveReload: true,
    historyApiFallback: true,
    static: {
      directory: path.resolve(__dirname, 'public')
    },
    setupMiddlewares: (middlewares) => automationPlugin.setupMiddlewares(middlewares),
    proxy: [
      {
        context: ['/api'],
        target: process.env.APP_API_PROXY || 'http://127.0.0.1:8000',
        changeOrigin: true,
        cookiePathRewrite: '/',
        xfwd: true,
        onProxyReq: (proxyReq, req) => {
          if (req.headers.host) {
            proxyReq.setHeader('X-Forwarded-Host', String(req.headers.host))
          }
        }
      },
      {
        context: ['/ws/collab'],
        target: process.env.APP_API_PROXY || 'http://127.0.0.1:8000',
        changeOrigin: true,
        ws: true,
        timeout: 0,
        proxyTimeout: 0
      },
      {
        context: ['/__openpencil-mcp'],
        target: `http://127.0.0.1:${AUTOMATION_HTTP_PORT}`,
        changeOrigin: true,
        pathRewrite: {
          '^/__openpencil-mcp': ''
        }
      }
    ]
  }
})
