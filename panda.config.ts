// https://panda-css.com/docs/references/config
import { defineConfig } from '@pandacss/dev'
import globalStyles from './src/globalStyles'
import anchorButtonRecipe from './src/recipes/anchorButton'
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
      },
      recipes: {
        icon: iconRecipe,
        anchorButton: anchorButtonRecipe,
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
