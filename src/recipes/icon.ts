import { defineRecipe } from '@pandacss/dev'

const iconRecipe = defineRecipe({
  className: 'icon',
  description: 'icon styles',
  base: {
    cursor: 'pointer',
    flex: 1,
    transition: 'all {durations.fast} ease-in-out',
  },
})

export default iconRecipe
