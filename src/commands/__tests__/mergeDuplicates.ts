import { importTextActionCreator as importText } from '../../actions/importText'
import { setCursorActionCreator as setCursorToPath } from '../../actions/setCursor'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import getAllChildrenAsThoughtsByContext from '../../test-helpers/getAllChildrenAsThoughtsByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import mergeDuplicatesCommand from '../mergeDuplicates'

beforeEach(initStore)

it('merge duplicate siblings at the level of the cursor into the first duplicate', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - w
        - a
          - x
          - y
          - z
        - b
          - c
      `,
    }),
    setCursor(['b']),
  ])

  executeCommandWithMulticursor(mergeDuplicatesCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - w
    - x
    - y
    - z
  - b
    - c`)
})

it('merge three or more duplicates', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - w
        - b
        - a
          - x
        - a
          - y
      `,
    }),
    setCursor(['b']),
  ])

  executeCommandWithMulticursor(mergeDuplicatesCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - w
    - x
    - y
  - b`)
})

it('merge duplicate subthoughts, leaving duplicates at other levels untouched', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - m
            - x
          - m
            - y
        - a
      `,
    }),
    setCursor(['a', 'm']),
  ])

  executeCommandWithMulticursor(mergeDuplicatesCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - m
      - x
      - y
  - a`)
})

it('do not merge empty thoughts', () => {
  store.dispatch([
    importText({
      text: `
        - a
        -${''}
        -${''}
        - a
      `,
    }),
    setCursor(['a']),
  ])

  executeCommandWithMulticursor(mergeDuplicatesCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
  -${' '}
  -${' '}`)
})

it('move the cursor to the surviving thought when the cursor is on a duplicate that is removed', () => {
  store.dispatch(
    importText({
      text: `
        - a
          - w
        - a
          - x
      `,
    }),
  )

  // the cursor cannot be set on the second duplicate by value, since contextToPath resolves to the first match
  const [firstA, secondA] = getAllChildrenAsThoughtsByContext(store.getState(), [HOME_TOKEN])
  store.dispatch(setCursorToPath({ path: [secondA.id] }))

  executeCommandWithMulticursor(mergeDuplicatesCommand, { store })

  const state = store.getState()

  expect(state.cursor).toEqual([firstA.id])
  expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - w
    - x`)
})

it('merge the duplicates of the cursor thought when the cursor crosses a context view', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - m
            - x
        - b
          - m
            - y
          - n
          - n
        - a
          - z
      `,
    }),
    setCursor(['a', 'm']),
    toggleContextView(),
    // the cursor is on the context b of a/m, i.e. the thought b at the root, so the duplicate a's at the root are
    // merged. The duplicate n's under b are at a different level and must be left alone.
    setCursor(['a', 'm', 'b']),
  ])

  executeCommandWithMulticursor(mergeDuplicatesCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - m
      - x
    - z
  - b
    - m
      - y
    - n
    - n`)
})

describe('multicursor', () => {
  it('merge duplicates once per selected level', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - m
            - m
          - b
            - n
            - n
        `,
      }),
      setCursor(['a', 'm']),
      addMulticursor(['a', 'm']),
      addMulticursor(['b', 'n']),
    ])

    executeCommandWithMulticursor(mergeDuplicatesCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - m
  - b
    - n`)
  })
})
