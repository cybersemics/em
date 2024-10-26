import { defineRecipe } from '@pandacss/dev'

const toolbarPointerEventsRecipe = defineRecipe({
  className: 'toolbar-pointer-events',
  description: 'A typesafe way to override pointerEvents: none on the Toolbar component.',
  base: {
    pointerEvents: 'none',
  },
  variants: {
    override: {
      true: {
        pointerEvents: 'auto',
      },
    },
  },
})

export default toolbarPointerEventsRecipe
