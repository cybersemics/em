import { importTextActionCreator as importText } from '../../actions/importText'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import hasMulticursor from '../../selectors/hasMulticursor'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import getChildrenRankedByContext from '../../test-helpers/getChildrenRankedByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import head from '../../util/head'
import newUncleCommand from '../newUncle'

beforeEach(initStore)

describe('multicursor', () => {
  it('creates an empty uncle for each selected sibling', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
            - c
          - x
        `,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['a', 'c']),
    ])

    executeCommandWithMulticursor(newUncleCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
    - c
  - 
  - 
  - x`)
  })

  it('creates an empty uncle for each selected thought across different parents and depths', () => {
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
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['c', 'd', 'e']),
    ])

    executeCommandWithMulticursor(newUncleCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
  - 
  - c
    - d
      - e
    - `)
  })

  it('skips a selected root thought instead of blocking the rest of the run', () => {
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
      addMulticursor(['b', 'c']),
    ])

    executeCommandWithMulticursor(newUncleCommand, { store })

    // a is at the root, so it has no parent to insert at and is skipped; c still gets its uncle
    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
  - b
    - c
  - `)
  })

  it('leaves the caret on the empty uncle of the last selected thought and clears the multicursor', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
          - c
            - d
        `,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['c', 'd']),
    ])

    executeCommandWithMulticursor(newUncleCommand, { store })

    const state = store.getState()
    const rootChildren = getChildrenRankedByContext(state, [HOME_TOKEN])

    // one empty uncle after each selected thought's parent
    expect(rootChildren.map(thought => thought.value)).toEqual(['a', '', 'c', ''])

    // the caret ends on the empty uncle created for the last selected thought, ready to type
    expect(state.cursor && head(state.cursor)).toBe(rootChildren[3].id)

    expect(hasMulticursor(state)).toBe(false)
  })

  it('creates a single empty uncle with the caret on it when one thought is selected', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
        `,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
    ])

    executeCommandWithMulticursor(newUncleCommand, { store })

    const state = store.getState()
    const exported = exportContext(state, [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
  - `)

    const rootChildren = getChildrenRankedByContext(state, [HOME_TOKEN])
    expect(state.cursor && head(state.cursor)).toBe(rootChildren[1].id)
    expect(hasMulticursor(state)).toBe(false)
  })

  it('reverts every created thought on a single undo', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
          - c
            - d
          - e
            - f
        `,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['c', 'd']),
      addMulticursor(['e', 'f']),
    ])

    executeCommandWithMulticursor(newUncleCommand, { store })

    // Precondition: all three uncles were created, otherwise the undo below would have nothing to revert.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - b
  - 
  - c
    - d
  - 
  - e
    - f
  - `)

    store.dispatch(undo())

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
  - c
    - d
  - e
    - f`)
  })
})
