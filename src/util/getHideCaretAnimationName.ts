import { cva } from '../../styled-system/css'
import { type RecipeVariantRecord } from '../../styled-system/types/recipe'
import { isSafari, isTouch } from '../browser'

export const hideCaretAnimationNames = [
  'hideCaret0',
  'hideCaret1',
  'hideCaret2',
  'hideCaret3',
  'hideCaret4',
  'hideCaret5',
  'hideCaret6',
  'hideCaret7',
  'hideCaret8',
  'hideCaret9',
  'hideCaretA',
  'hideCaretB',
  'hideCaretC',
  'hideCaretD',
  'hideCaretE',
  'hideCaretF',
] as const

const hideCaret = cva({
  base: {
    animationDuration: '{durations.layoutSlowShift}',
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
