import { defineRecipe } from '@pandacss/dev'

const linkRecipe = defineRecipe({
  className: 'link',
  description: '<a> styles',
  base: {},
  variants: {
    in: {
      breadcrumbs: {
        color: 'inherit',
        textDecoration: 'none',
      },
    },
  },
})

export default linkRecipe
