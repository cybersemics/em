import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import proseViewCommand from '../proseView'

beforeEach(initStore)

it('toggle on prose view of parent of cursor (initial state without =view attribute)', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - c
    `,
    }),
    setCursor(['a']),
  ])

  executeCommand(proseViewCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- __ROOT__
  - a
    - =view
      - Prose
    - b
      - c`)
})

it('toggle on prose view of parent of cursor (initial state with =view attribute set to Table)', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =view
            - table
          - b
            - c
    `,
    }),
    setCursor(['a']),
  ])

  executeCommand(proseViewCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- __ROOT__
  - a
    - =view
      - Prose
    - b
      - c`)
})

it('toggle off prose view of parent of cursor', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =view
            - Prose
          - b
            - c
    `,
    }),
    setCursor(['a']),
  ])

  executeCommand(proseViewCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- __ROOT__
  - a
    - b
      - c`)
})

describe('multicursor', () => {
  it('toggles prose view on multiple thoughts', async () => {
    store.dispatch([
      importText({
        text: `
          - a
            - a1
            - a2
          - b
            - b1
            - b2
          - c
            - c1
            - c2
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
      addMulticursor(['c']),
    ])

    executeCommandWithMulticursor(proseViewCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
    - =view
      - Prose
    - a1
    - a2
  - b
    - =view
      - Prose
    - b1
    - b2
  - c
    - =view
      - Prose
    - c1
    - c2`)
  })

  it('toggles prose view off for thoughts that already have it', async () => {
    store.dispatch([
      importText({
        text: `
          - a
            - =view
              - Prose
            - a1
            - a2
          - b
            - b1
            - b2
          - c
            - =view
              - Prose
            - c1
            - c2
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
      addMulticursor(['c']),
    ])

    executeCommandWithMulticursor(proseViewCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
    - a1
    - a2
  - b
    - =view
      - Prose
    - b1
    - b2
  - c
    - c1
    - c2`)
  })

  it('handles mixed scenarios correctly', async () => {
    store.dispatch([
      importText({
        text: `
          - a
            - =view
              - Table
            - a1
            - a2
          - b
            - b1
            - b2
          - c
            - =view
              - Prose
            - c1
            - c2
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
      addMulticursor(['c']),
    ])

    executeCommandWithMulticursor(proseViewCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
    - =view
      - Prose
    - a1
    - a2
  - b
    - =view
      - Prose
    - b1
    - b2
  - c
    - c1
    - c2`)
  })
})
