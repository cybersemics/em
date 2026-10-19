import CommandId from '../../@types/CommandId'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleHiddenThoughtsActionCreator as toggleHiddenThoughts } from '../../actions/toggleHiddenThoughts'
import { commandById } from '../../commands'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(initStore)

/** Commands that format, lay out, or restructure the selected thought, and so must not execute on a metaprogramming attribute. */
const commandIds: CommandId[] = [
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'code',
  'removeFormat',
  'heading0',
  'heading1',
  'heading2',
  'heading3',
  'heading4',
  'heading5',
  'textColor',
  'letterCase',
  'toggleTableView',
  'toggleContextView',
  'proseView',
  'toggleSort',
  'toggleSortPicker',
  'toggleBulletPicker',
  'toggleDone',
  'pin',
  'pinAll',
  'pinDescendants',
  'splitSentences',
  'join',
  'extractSubthought',
  'extractCategory',
  'defineTerm',
  'generateEmoji',
  'generateThought',
  'categorize',
  'uncategorize',
  'bindContext',
  'note',
  'swapGrandparent',
  'swapParent',
  'swapNote',
]

const text = `
  - x
    - aaa
      - =favorite
      - bbb
`

// https://github.com/cybersemics/em/issues/6009
describe.each(commandIds)('%s', id => {
  it('can execute on an ordinary thought', () => {
    store.dispatch([importText({ text }), toggleHiddenThoughts(), setCursor(['x', 'aaa', 'bbb'])])
    expect(commandById(id).canExecute!(store.getState())).toBe(true)
  })

  it('cannot execute on a metaprogramming attribute', () => {
    store.dispatch([importText({ text }), toggleHiddenThoughts(), setCursor(['x', 'aaa', '=favorite'])])
    expect(commandById(id).canExecute!(store.getState())).toBe(false)
  })

  it('cannot execute on a selection that contains a metaprogramming attribute', () => {
    store.dispatch([
      importText({ text }),
      toggleHiddenThoughts(),
      setCursor(['x', 'aaa', 'bbb']),
      addMulticursor(['x', 'aaa', 'bbb']),
      addMulticursor(['x', 'aaa', '=favorite']),
    ])
    expect(commandById(id).canExecute!(store.getState())).toBe(false)
  })
})
