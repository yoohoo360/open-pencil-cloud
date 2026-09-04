export const tailwindcssRule = {
  test: /\.css$/,
  exclude: /\.module\.css$/,
  type: 'css' as const,
  use: [
    {
      loader: 'postcss-loader',
      options: {
        postcssOptions: {
          plugins: ['@tailwindcss/postcss']
        }
      }
    }
  ]
}

export function tailwindcss() {
  return {
    apply() {}
  }
}
