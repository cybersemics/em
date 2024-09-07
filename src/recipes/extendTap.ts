import { defineRecipe } from '@pandacss/dev'

const extendTapRecipe = defineRecipe({
  className: 'extend-tap',
  base: {
    margin: '-0.5em',
    padding: '0.5em',
  },
})

export default extendTapRecipe
