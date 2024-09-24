import { defineSlotRecipe } from '@pandacss/dev'

const modalTextRecipe = defineSlotRecipe({
  slots: ['subtitle', 'wrapper', 'description', 'link'],
  className: 'modal-text',
  base: {
    subtitle: {
      fontFamily: "'Helvetica Neue'",
      fontSize: '1.7em',
    },
    wrapper: {
      display: 'flex',
      minHeight: '100px',
      flexDirection: 'column',
    },
    description: {
      fontSize: '18px',
      marginBottom: '30px',
    },
  },
  variants: {
    compact: {
      true: {
        subtitle: {
          marginBottom: '0.8em',
        },
      },
    },
  },
})

export default modalTextRecipe
