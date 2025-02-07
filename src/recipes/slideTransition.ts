import { defineSlotRecipe } from '@pandacss/dev'

const slideTransitionRecipe = defineSlotRecipe({
  className: 'slide',
  slots: ['enter', 'exit', 'exitActive', 'enterActive', 'enterDone', 'exitDone'],
  base: {
    enter: { opacity: 0 },
    exit: { opacity: 1 },
  },
  variants: {
    from: {
      right: {
        enter: { transform: 'translateX(100%)' },
        enterActive: { transform: 'translateX(0)', transition: 'all {durations.fast} ease-out' },
        exit: { transform: 'translateX(0)' },
        exitActive: { transform: 'translateX(100%)', transition: 'all {durations.fast} ease-out' },
      },
      down: {
        enter: { marginBottom: '0px', marginTop: '-3em' },
        enterActive: {
          marginBottom: '1em',
          marginTop: '0px',
          transition: 'margin {durations.veryFast} ease-out',
        },
        enterDone: { marginBottom: '1em', marginTop: '0px' },
        exit: { marginBottom: '1em', marginTop: '0px' },
        exitActive: {
          marginBottom: '0px',
          marginTop: '-3em',
          transition: 'margin {durations.veryFast} ease-out',
        },
        exitDone: { marginBottom: '0px', marginTop: '-3em' },
      },
      screenRight: {
        enter: { transform: 'translateX(100vw)', opacity: 0, position: 'absolute' },
        enterActive: {
          '&.slide__enter': {
            // formerly .slide-enter.slide-enter-active
            // to override opacity
            transform: 'translateX(0)',
            opacity: 1,
            transition: 'all {durations.fast} ease-in-out {durations.fast}',
          },
        },
        exit: { transform: 'translateX(0)', opacity: 1 },
        exitActive: {
          '&.slide__exit': {
            // formerly .slide-exit.slide-exit-active
            // to override opacity
            transform: 'translateX(-100vw)',
            opacity: 0,
          },
        },
      },
    },
  },
  staticCss: ['*'],
})

export default slideTransitionRecipe
