import { defineRecipe } from '@pandacss/dev'

const textNoteRecipe = defineRecipe({
  className: 'text-note',
  base: {
    fontStyle: 'italic',
    color: { base: 'rgba(7, 7, 7, 0.5)', _dark: 'rgba(255, 255, 255, 0.5)' },
  },
  variants: {
    inverse: {
      true: {
        color: { base: 'rgba(255, 255, 255, 0.5)', _dark: 'rgba(7, 7, 7, 0.5)' },
      },
    },
  },
})

export default textNoteRecipe
