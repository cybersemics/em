import { defineRecipe } from '@pandacss/dev'

const textNoteRecipe = defineRecipe({
  className: 'text-note',
  base: {
    fontStyle: 'italic',
    color: 'dim',
  },
  variants: {
    inverse: {
      true: {
        color: 'dimInverse',
      },
    },
  },
})

export default textNoteRecipe
