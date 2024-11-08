import { defineRecipe } from '@pandacss/dev'

const tutorialBulletRecipe = defineRecipe({
  className: 'tutorial-bullet',
  description: 'For styling all <li> elements in the tutorial',
  base: {
    listStyle: 'disc',
    lineHeight: 1.5,
  },
})

export default tutorialBulletRecipe
