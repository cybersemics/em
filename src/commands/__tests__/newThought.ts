import { importTextActionCreator as importText } from '../../actions/importText'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { getChildrenRanked } from '../../selectors/getChildren'
import hasMulticursor from '../../selectors/hasMulticursor'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import head from '../../util/head'
import newThoughtCommand from '../newThought'

beforeEach(initStore)

it('create an empty thought after the cursor thought', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
      `,
    }),
    setCursor(['a']),
  ])

  executeCommandWithMulticursor(newThoughtCommand, { store })

  const state = store.getState()
  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - ${''}
  - b`)

  // expect cursor to be on the new thought
  expectPathToEqual(state, state.cursor, [''])
})

describe('multicursor', () => {
  it('create a new empty thought after each selected thought', () => {
    store.dispatch([
      importText({
        text: `
            - a
            - b
            - c
            - d
            - e
          `,
      }),
      setCursor(['c']),
      addMulticursor(['c']),
      addMulticursor(['d']),
    ])

    executeCommandWithMulticursor(newThoughtCommand, { store })

    const state = store.getState()
    const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b
  - c
  - ${''}
  - d
  - ${''}
  - e`)

    // expect multicursor to be cleared
    expect(hasMulticursor(state)).toBeFalse()

    // expect cursor to be on the last created thought (the empty thought after d), ready for typing
    const children = getChildrenRanked(state, HOME_TOKEN)
    expect(head(state.cursor!)).toBe(children[5].id)
  })

  it('create each new thought as a sibling of its own selected thought across parents and depths', () => {
    store.dispatch([
      importText({
        text: `
            - a
              - a1
              - a2
            - b
              - b1
          `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['a', 'a1']),
      addMulticursor(['b', 'b1']),
    ])

    executeCommandWithMulticursor(newThoughtCommand, { store })

    const state = store.getState()
    const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - a1
    - ${''}
    - a2
  - ${''}
  - b
    - b1
    - ${''}`)

    // expect multicursor to be cleared
    expect(hasMulticursor(state)).toBeFalse()

    // expect cursor to be on the last created thought (the empty thought after b1)
    const bChildren = getChildrenRanked(state, head(state.cursor!.slice(0, -1)))
    expectPathToEqual(state, state.cursor, ['b', ''])
    expect(head(state.cursor!)).toBe(bChildren[1].id)
  })

  it('create a single empty thought after a single selected thought', () => {
    store.dispatch([
      importText({
        text: `
            - a
            - b
          `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
    ])

    executeCommandWithMulticursor(newThoughtCommand, { store })

    const state = store.getState()
    const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - ${''}
  - b`)

    // expect multicursor to be cleared
    expect(hasMulticursor(state)).toBeFalse()

    // expect cursor to be on the new thought
    expectPathToEqual(state, state.cursor, [''])
  })

  it('revert every created thought on a single undo', () => {
    store.dispatch([
      importText({
        text: `
            - a
            - b
            - c
          `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
      addMulticursor(['c']),
    ])

    executeCommandWithMulticursor(newThoughtCommand, { store })

    // Precondition: all three thoughts were created, otherwise the undo below would have nothing to revert.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - ${''}
  - b
  - ${''}
  - c
  - ${''}`)

    store.dispatch(undo())

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b
  - c`)
  })

  // https://github.com/cybersemics/em/issues/3564
  it.skip('selects the new thoughts after execution', () => {
    store.dispatch([
      importText({
        text: `
            - a
            - b
          `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
    ])

    executeCommandWithMulticursor(newThoughtCommand, { store })

    const state = store.getState()
    const newThoughts = getChildrenRanked(state, HOME_TOKEN).filter(child => child.value === '')

    expect(Object.values(state.multicursors).map(head)).toEqual(newThoughts.map(child => child.id))
  })
})
