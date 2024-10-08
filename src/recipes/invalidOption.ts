import { defineRecipe } from '@pandacss/dev'

const invalidOptionRecipe = defineRecipe({
  className: 'invalid-option',
  base: {
    color: 'invalidOption',
  },
})

export default invalidOptionRecipe
