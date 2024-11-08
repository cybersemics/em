import { defineRecipe } from '@pandacss/dev'

const upperRightRecipe = defineRecipe({
  className: 'upper-right',
  base: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
})

export default upperRightRecipe
