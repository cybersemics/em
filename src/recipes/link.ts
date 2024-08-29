import { defineRecipe } from '@pandacss/dev'

const linkRecipe = defineRecipe({
  className: 'link',
  description: '<a> styles',
  base: {},
  variants: {
    in: {
      modal: {
        color: 'lightblue',
      },
      breadcrumbs: {
        color: 'inherit',
        textDecoration: 'none',
      },
      thoughtAnnotation: {
        height: '1em',
        display: 'inline-block',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 'thoughtAnnotationLink',
      },
      footer: {
        color: { _dark: 'skyblue' },
      },
      tutorialText: {
        color: { _dark: '#87ceeb' },
      },
    },
  },
})

export default linkRecipe
