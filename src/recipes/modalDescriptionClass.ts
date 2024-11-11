import { css } from '../../styled-system/css'

// Overrides the default paragraph margin in the modal recipe.
const modalDescriptionClass = css({
  fontSize: '18px',
  marginBottom: '30px', // overrides margin in modalRecipe root on <p> elements
})

export default modalDescriptionClass
