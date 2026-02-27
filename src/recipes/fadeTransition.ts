import { defineSlotRecipe } from '@pandacss/dev'

/*
  Safari skew: Safari requires inverted skew values (positive instead of negative) when exceeding 90deg to have the same behavior as other browsers.
*/

const fadeTransitionRecipe = defineSlotRecipe({
  className: 'fade',
  slots: ['enter', 'exit', 'exitActive', 'enterActive', 'enterDone', 'exitDone'],
  base: {
    enter: { opacity: 0 },
    enterActive: { opacity: 1 },
    enterDone: { opacity: 1 },
    exit: { opacity: 1 },
    exitActive: { opacity: 0 },
    exitDone: { opacity: 0 },
  },
  variants: {
    type: {
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
      commandCenterDrawer: {
        // Easing follows that of Material UI SwipeableDrawer.
        enterActive: { transition: `opacity {durations.commandCenterDrawer} cubic-bezier(0, 0, 0.2, 1) 0ms` },
        exitActive: { transition: `opacity {durations.commandCenterDrawer} cubic-bezier(0.4, 0, 0.2, 1) 0ms` },
      },
      activeButtonGlowLuminosity: {
        enter: { opacity: 0 },
        enterActive: { opacity: 0.75, transition: `opacity {durations.activeButtonGlowLuminosity} ease 0ms` },
        enterDone: { opacity: 0.75 },
        exit: { opacity: 0.75 },
        exitActive: { opacity: 0, transition: `opacity {durations.activeButtonGlowLuminosity} ease 0ms` },
        exitDone: { opacity: 0 },
      },
      activeButtonGlowSaturation: {
        enter: { opacity: 0 },
        enterActive: { opacity: 0.45, transition: `opacity {durations.activeButtonGlowSaturation} ease 0ms` },
        enterDone: { opacity: 0.45 },
        exit: { opacity: 0.45 },
        exitActive: { opacity: 0, transition: `opacity {durations.activeButtonGlowSaturation} ease 0ms` },
        exitDone: { opacity: 0 },
      },
      distractionFreeTyping: {
        enterActive: { transition: `opacity {durations.distractionFreeTyping} ease 0ms` },
        exitActive: { transition: `opacity {durations.slow} ease 0ms` },
      },
      // Fade in new thoughts at the same rate as layoutNodeAnimation.
      // The easing at the start of the animation is important to give the thoughts below time to move out of the way.
      // Otherwise the new thought (bullet, placeholder, and caret) will overlap the next sibling which doesn't look great.
      // The easing at the end of the animation helps the animation feel snappier by slightly compressing the time before opacity 0.5 is reached, i.e. the thought becomes visible earlier in order to give time for the easing at the end.
      nodeFadeIn: {
        enterActive: { transition: `opacity {durations.nodeFadeIn} ease-in-out` },
      },
      // Fade out unmounted thought. For example, when navigating the cursor away from a thought, it will collapse and its children will unmount.
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
      // Context view fades in from upper right.
      disappearingUpperRight: {
        enter: {
          transform: 'skew(-100deg) translateX(10%) translateY(-100%)',
          filter: 'blur(8px)',
          // See: Safari skew note above
          _safari: {
            transform: 'skew(100deg) translateX(10%) translateY(-100%)',
          },
        },
        enterActive: {
          transform: 'skew(0) translateX(0) translateY(0)',
          filter: 'blur(0px)',
          transition: `opacity {durations.disappearingUpperRight} {easings.easeInSmooth}, transform {durations.disappearingUpperRight} {easings.easeInSmooth}, filter {durations.disappearingUpperRight} {easings.easeInSmooth}`,
          // See: Safari skew note above
          _safari: {
            transform: 'skew(0) translateX(0) translateY(0)',
          },
        },
        exit: {
          filter: 'blur(0px)',
        },
        exitActive: {
          transform: 'skew(-100deg) translateX(10%) translateY(-100%)',
          filter: 'blur(8px)',
          transition: `opacity {durations.disappearingUpperRight} ease, transform {durations.disappearingUpperRight} ease, filter {durations.disappearingUpperRight} ease`,
          // See: Safari skew note above
          _safari: {
            transform: 'skew(100deg) translateX(10%) translateY(-100%)',
          },
        },
      },
      // Normal view fades out from lower left.
      disappearingLowerLeft: {
        enter: {
          transform: 'skew(-100deg) translateY(100%)',
          filter: 'blur(8px)',
          // See: Safari skew note above
          _safari: {
            transform: 'skew(100deg) translateY(100%)',
          },
        },
        enterActive: {
          transform: 'skew(0) translateX(0) translateY(0)',
          filter: 'blur(0px)',
          transition: `opacity {durations.disappearingLowerLeft} {easings.easeInSmooth}, transform {durations.disappearingLowerLeft} {easings.easeInSmooth}, filter {durations.disappearingLowerLeft} {easings.easeInSmooth}`,
          // See: Safari skew note above
          _safari: {
            transform: 'skew(0) translateX(0) translateY(0)',
          },
        },
        exit: {
          filter: 'blur(0px)',
        },
        exitActive: {
          transform: 'skew(-100deg) translateY(100%)',
          filter: 'blur(8px)',
          transition: `opacity {durations.disappearingLowerLeft} ease, transform {durations.disappearingLowerLeft} ease, filter {durations.disappearingLowerLeft} ease`,
          // See: Safari skew note above
          _safari: {
            transform: 'skew(100deg) translateY(100%)',
          },
        },
      },
    },
  },
  staticCss: ['*'],
})

export default fadeTransitionRecipe
