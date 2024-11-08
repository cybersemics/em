import { defineRecipe } from '@pandacss/dev'

const bulletRecipe = defineRecipe({
  className: 'bullet',
  base: {
    top: 0,
    zIndex: 'bullet',
  },
  variants: {
    invalid: {
      true: {
        color: 'invalidOption',
      },
    },
  },
})

export default bulletRecipe
