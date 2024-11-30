import { defineSlotRecipe } from '@pandacss/dev'

const fadeTransitionRecipe = defineSlotRecipe({
  className: 'fade',
  slots: ['enter', 'exit', 'exitActive', 'enterActive', 'enterDone', 'exitDone'],
  base: {
    enter: { opacity: 0 },
    enterActive: { opacity: 1 },
    exit: { opacity: 1 },
    exitActive: { opacity: 0 },
  },
  variants: {
    duration: {
      fast: {
        enterActive: { transition: `opacity {durations.fastDuration} ease-out` },
        exitActive: { transition: `opacity {durations.fastDuration} ease-out` },
      },
      slow: {
        enterActive: { transition: `opacity {durations.fastDuration} ease-out` },
        exitActive: { transition: `opacity {durations.slowDuration} ease-out` },
      },
      medium: {
        enterActive: { transition: `opacity {durations.mediumDuration} ease 0ms` },
        exitActive: { transition: `opacity {durations.mediumDuration} ease 0ms` },
      },
      distractionFreeTyping: {
        enterActive: { transition: `opacity {durations.distractionFreeTypingDuration} ease 0ms` },
        exitActive: { transition: `opacity {durations.slowDuration} ease 0ms` },
      },
    },
  },
  staticCss: ['*'],
})

export default fadeTransitionRecipe
