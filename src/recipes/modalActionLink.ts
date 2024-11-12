import { defineRecipe } from '@pandacss/dev'

const modalActionRecipe = defineRecipe({
  className: 'modal-actions-a',
  description: '<a> styles in action={} prop of modal, formerly in .modal__actions: { & a }',
  base: {
    fontWeight: 'normal',
    margin: '0 5px',
    textDecoration: 'underline',
    whiteSpace: 'nowrap',
    lineHeight: 2,
    color: 'fg',
  },
})

export default modalActionRecipe
