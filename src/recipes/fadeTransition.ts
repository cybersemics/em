import { defineSlotRecipe } from '@pandacss/dev'

const fadeTransitionRecipe = defineSlotRecipe({
  className: 'fade',
  slots: ['enter', 'exit', 'exitActive', 'enterActive', 'enterDone', 'exitDone'],
  base: {
    enter: { opacity: 0 },
    enterActive: { opacity: 1 },
    exit: { opacity: 1 },
    exitActive: { opacity: 0 },
    exitDone: { opacity: 0 },
  },
  variants: {
    duration: {
      fast: {
        enterActive: { transition: `opacity {durations.fast} ease-out` },
        exitActive: { transition: `opacity {durations.fast} ease-out` },
      },
      slow: {
        enterActive: { transition: `opacity {durations.fast} ease-out` },
        exitActive: { transition: `opacity {durations.slow} ease-out` },
      },
      medium: {
        enterActive: { transition: `opacity {durations.medium} ease 0ms` },
        exitActive: { transition: `opacity {durations.medium} ease 0ms` },
      },
      distractionFreeTyping: {
        enterActive: { transition: `opacity {durations.distractionFreeTyping} ease 0ms` },
        exitActive: { transition: `opacity {durations.slow} ease 0ms` },
      },
      nodeFadeIn: {
        enterActive: { transition: `opacity {durations.nodeFadeIn} ease-in-out` },
      },
      nodeFadeOut: {
        enter: { opacity: 1 },
        exitActive: { transition: `opacity {durations.nodeFadeOut} ease-out` },
      },
      nodeDissolve: {
        enter: {
          transform: 'scale3d(1, 1, 1)',
          filter: 'blur(0)',
        },
        enterActive: {
          transform: 'scale3d(1, 1, 1)',
          filter: 'blur(0)',
          transition: `opacity {durations.nodeDissolve} ease-out, transform {durations.nodeDissolve} ease-out, filter {durations.nodeDissolve} ease-out`,
        },
        exit: {
          transform: 'scale3d(1, 1, 1)',
          filter: 'blur(0)',
          transformOrigin: 'left',
        },
        exitActive: {
          opacity: 0,
          transform: 'scale3d(0.5, 0.5, 0.5)',
          filter: 'blur(4px)',
          transformOrigin: 'left',
          transition: `opacity {durations.nodeDissolve} ease-out, transform {durations.nodeDissolve} ease-out, filter {durations.nodeDissolve} ease-out`,
        },
      },
    },
  },
  staticCss: ['*'],
})

export default fadeTransitionRecipe
