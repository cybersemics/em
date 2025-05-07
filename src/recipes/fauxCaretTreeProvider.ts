import { cva } from '../../styled-system/css'
import { type RecipeVariantRecord } from '../../styled-system/types/recipe'
import { isSafari, isTouch } from '../browser'

// TODO: FauxCaret will break if hideCaretAnimationNames is imported from hideCaret.config.ts into hideCaret.ts, and vice versa into panda.config.ts, so we are stuck with duplicate definitions in two files.
const hideCaretAnimationNames = [
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
  'hideCaretG',
  'hideCaretH',
  'hideCaretI',
  'hideCaretJ',
  'hideCaretK',
  'hideCaretL',
  'hideCaretM',
  'hideCaretN',
  'hideCaretO',
  'hideCaretP',
  'hideCaretQ',
  'hideCaretR',
  'hideCaretS',
  'hideCaretT',
  'hideCaretU',
  'hideCaretV',
] as const

const fauxCaretRecipe = cva({
  base: {
    '--faux-caret-opacity': '0',
    '--faux-caret-line-end-opacity': '0',
    '--faux-caret-line-start-opacity': '0',
    '--faux-caret-note-line-end-opacity': '0',
    '--faux-caret-note-line-start-opacity': '0',
    // apply the animation to the LayoutTree in all circumstances so that it will not "change" when a new thought is added,
    // but only "play" the animation if there are multiple thoughts
    // the depth level will change as it always has, but the animation will not play at depth 0 when a new thought is added
    '&:has([aria-label=tree-node]:nth-child(2))': {
      animationDuration: 'layoutSlowShift',
    },
  },
  variants: {
    animation: hideCaretAnimationNames.reduce(
      (accum, animationName) => ({ ...accum, [animationName]: { animationName } }),
      { none: {} },
    ),
  } as RecipeVariantRecord,
})

/** The root fauxCaret recipe that sets the faux caret animation vars in LayoutTree. Picks from a set of identical hideCaret animations based on a thought's indent depth. This ensures that the animation plays again each time the indent depth changes. */
const fauxCaretTreeProvider = (indent: number) => {
  // Since indent is fractional, we need to scale bit up to get integer steps.
  // There is nothing magical about the number 2, but it seems to cover all the cases without causing nearby collisions.
  const indentStep = Math.ceil(indent * 2)
  return fauxCaretRecipe({
    animation: isTouch && isSafari() ? hideCaretAnimationNames[indentStep % hideCaretAnimationNames.length] : 'none',
  })
}

export default fauxCaretTreeProvider
