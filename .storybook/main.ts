import type { StorybookConfig } from '@storybook/react-vite'
import type { PluginOption } from 'vite'

function flattenPlugins(plugins: PluginOption[]): PluginOption[] {
  return plugins.flatMap((plugin) => (Array.isArray(plugin) ? flattenPlugins(plugin) : [plugin]))
}

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|ts|tsx)', '../packages/react/src/**/*.stories.@(js|ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-themes'],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  viteFinal(config) {
    const excludedPluginPrefixes = [
      'copy-canvaskit-wasm',
      'open-pencil-automation',
      'vite-plugin-pwa'
    ]

    config.plugins = flattenPlugins(config.plugins ?? []).filter((plugin) => {
      if (!plugin || typeof plugin !== 'object' || !('name' in plugin)) return true
      return !excludedPluginPrefixes.some((prefix) => plugin.name.startsWith(prefix))
    })
    return config
  }
}

export default config
