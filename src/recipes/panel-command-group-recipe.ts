import { defineRecipe } from '@pandacss/dev'

export default defineRecipe({
  className: 'panelCommandGroupRecipe',
  base: {
    display: 'grid',
  },
  variants: {
    layout: {
      'medium-2': {
        gridColumn: 'span 4',
        gridTemplateColumns: '1fr 1fr',
      },
      'small-2': {
        gridColumn: 'span 2',
        gridTemplateColumns: '1fr 1fr',
      },
      'small-3': {
        gridColumn: 'span 3',
        gridTemplateColumns: '1fr 1fr 1fr',
      },
      'small-4': {
        gridColumn: 'span 4',
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
      },
    },
  },
  defaultVariants: {
    layout: 'small-2',
  },
  staticCss: [{ layout: ['small-2', 'small-3', 'small-4', 'medium-2'] }],
})
