// https://panda-css.com/docs/references/config
import { defineConfig } from '@pandacss/dev'

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
        fontSizes: {
          small: {
            value: '80%',
          },
          medium: {
            value: '90%',
          },
        },
      },
    },
  },

  // The output directory for your css system
  outdir: 'styled-system',
})
