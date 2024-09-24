import { defineRecipe } from '@pandacss/dev'

const extendTapRecipe = defineRecipe({
  className: 'extend-tap',
  base: {
    margin: '-0.5em',
    padding: '0.5em',
  },
  variants: {
    size: {
      small: {
        margin: '-0.25em',
        padding: '0.25em',
      },
    },
  },
})

export default extendTapRecipe
