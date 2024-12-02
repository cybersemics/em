import { cva } from '../../styled-system/css'
import { RecipeVariantRecord } from '../../styled-system/types/recipe'
import { isSafari, isTouch } from '../browser'
import hideCaretAnimationNames from '../hideCaret.config'

const hideCaret = cva({
  base: {
    animationDuration: '{durations.layoutSlowShiftDuration}',
    marginTop: '0.501em',
  },
  variants: {
    animation: hideCaretAnimationNames.reduce(
      (accum, animationName) => ({ ...accum, [animationName]: { animationName } }),
      { none: {} },
    ),
  } as RecipeVariantRecord,
})

type HideCaretAnimationName = (typeof hideCaretAnimationNames)[number]

/** Pick from a set of identical hideCaret animations based on a thought's indent depth. This ensures that the animation plays again each time the indent depth changes. */
export const getHideCaretAnimationName = (indentDepth: number): HideCaretAnimationName | 'none' =>
  isTouch && isSafari() ? hideCaretAnimationNames[indentDepth % hideCaretAnimationNames.length] : 'none'

export default hideCaret
