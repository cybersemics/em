// https://panda-css.com/docs/references/config
import { defineConfig } from '@pandacss/dev'
import globalStyles from './src/globalStyles'
import iconRecipe from './src/recipes/icon'
import convertColorsToPandaCSS from './src/util/convertColorsToPandaCSS'

const { colorTokens, colorSemanticTokens } = convertColorsToPandaCSS()

export default defineConfig({
  // Where to look for your css declarations
  include: ['./src/**/*.{js,jsx,ts,tsx}'],

  // Files to exclude
  exclude: [],

  // Disable style props on JSX components
  jsxStyleProps: 'none',

  // Disable Panda-specific shorthand properties
  shorthands: false,

  // Useful for theme customization
  theme: {
    extend: {
      tokens: {
        colors: colorTokens,
        fontSizes: {
          sm: {
            value: '80%',
          },
          md: {
            value: '90%',
          },
        },
        spacing: {
          'safe-area-top': { value: 'env(safe-area-inset-top)' },
          'safe-area-bottom': { value: 'env(safe-area-inset-bottom)' },
        },
        zIndex: {
          popup: { value: 1500 },
          'gesture-trace': { value: 50 },
          'command-palette': { value: 45 },
          modal: { value: 40 },
          'hamburger-menu': { value: 30 },
          sidebar: { value: 25 },
          'toolbar-container': { value: 20 },
          'toolbar-overlay': { value: 15 },
          'toolbar-arrow': { value: 15 },
          toolbar: { value: 10 },
          navbar: { value: 10 },
          'latest-shortcuts': { value: 10 },
          'tutorial-trace-gesture': { value: 5 },
          'drop-empty': { value: 6 },
          'subthoughts-drop-end': { value: 5 },
          tutorial: { value: 3 },
          'scroll-zone': { value: 2 },
          'thought-annotation-link': { value: 2 },
          resizer: { value: 2 },
          bullet: { value: 2 },
          stack: { value: 1 },
          hide: { value: -1 },
        },
      },
      recipes: {
        icon: iconRecipe,
      },
      semanticTokens: {
        colors: {
          ...colorSemanticTokens,
          bgMuted: {
            value: {
              base: '#ddd',
              _dark: '#333',
            },
          },
        },
      },
    },
  },

  globalCss: globalStyles,

  conditions: {
    light: '[data-color-mode=light] &',
    dark: '[data-color-mode=dark] &',
  },

  // The output directory for your css system
  outdir: 'styled-system',
  presets: [],
})
