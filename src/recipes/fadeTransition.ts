import { defineSlotRecipe } from '@pandacss/dev'

const fadeTransitionRecipe = defineSlotRecipe({
  className: 'fade',
  slots: ['enter', 'exit', 'exitActive', 'enterActive'],
  base: {
    enter: { opacity: 0 },
    exit: { opacity: 1 },
  },
  variants: {
    duration: {
      medium: {
        enterActive: { opacity: 1, transition: `opacity {durations.fastDuration} ease-out` },
        exitActive: { opacity: 0, transition: `opacity {durations.fastDuration} ease-out` },
      },
      slow: {
        enterActive: { opacity: 1, transition: `opacity {durations.fastDuration} ease-out` },
        exitActive: { opacity: 0, transition: `opacity 0.8s ease-out` },
      },
    },
  },
})

export default fadeTransitionRecipe
