import { defineSlotRecipe } from '@pandacss/dev'

const modalTextRecipe = defineSlotRecipe({
  slots: ['subtitle', 'wrapper', 'description', 'link'],
  className: 'modal-text',
  base: {
    subtitle: {
      fontFamily: "'Helvetica Neue'",
      fontSize: '0.9em',
      marginBlock: '0.9em 0px',
      fontWeight: 700,
      padding: '0.4em',
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
})

export default modalTextRecipe
