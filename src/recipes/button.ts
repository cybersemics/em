import { defineRecipe } from '@pandacss/dev'

const buttonRecipe = defineRecipe({
  className: 'button',
  description: 'Styles for <button> buttons',
  base: {
    cursor: 'pointer',
    background: 'transparent',
    color: 'codeBgInverse',
    display: 'block',
    border: '0 none',
    margin: '10px auto 0',
    '&:focus': {
      color: 'fg',
      outline: '0 none',
      border: '0 none',
    },
  },
})

export default buttonRecipe
