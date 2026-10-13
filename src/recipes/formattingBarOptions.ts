import { defineRecipe } from '@pandacss/dev'

/** The row of options in the Formatting Bar's picker popover. */
const formattingBarOptionsRecipe = defineRecipe({
  className: 'formatting-bar-options',
  base: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    maxWidth: '100%',
    gap: '12px',
  },
})

export default formattingBarOptionsRecipe
