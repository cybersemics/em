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
] as const

export default hideCaretAnimationNames
