import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import attributeByContext from '../../test-helpers/attributeByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import toggleTableViewCommand from '../toggleTableView'

beforeEach(initStore)

it('toggle on table view of parent of cursor (initial state without =view attribute)', () => {
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
  ])

  executeCommand(toggleTableViewCommand, { store })

  // parent of cursor should have =view attribute set to Table
  expect(attributeByContext(store.getState(), ['a'], '=view')).toBe('Table')
})

it('toggle on table view of parent of cursor (initial state =view attribute set to Prose)', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =view
            - Prose
          - b
            - c
          - d
            - e
    `,
    }),
    setCursor(['a', 'b']),
  ])

  executeCommand(toggleTableViewCommand, { store })

  // parent of cursor should have =view attribute set to Table
  expect(attributeByContext(store.getState(), ['a'], '=view')).toBe('Table')
})

it('toggle on table view of parent of cursor (initial state without =view attribute)', () => {
  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - =view
            - Table
          - b
            - c
          - d
            - e
      `,
    }),
    setCursor(['a', 'b']),
  ])

  executeCommand(toggleTableViewCommand, { store })

  // parent of cursor should not have =view attribute set to Table
  expect(attributeByContext(store.getState(), ['a'], '=view')).toBe(null)
})

describe('multicursor', () => {
  it('toggles table view on for multiple thoughts', async () => {
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
      setCursor(['a', 'a1']),
      addMulticursor(['a', 'a1']),
      addMulticursor(['b', 'b1']),
      addMulticursor(['c', 'c1']),
    ])

    executeCommandWithMulticursor(toggleTableViewCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
    - =view
      - Table
    - a1
    - a2
  - b
    - =view
      - Table
    - b1
    - b2
  - c
    - =view
      - Table
    - c1
    - c2`)
  })

  it('handles mixed scenarios with table view on and off', async () => {
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
      setCursor(['a', 'a1']),
      addMulticursor(['a', 'a1']),
      addMulticursor(['b', 'b1']),
      addMulticursor(['c', 'c1']),
    ])

    executeCommandWithMulticursor(toggleTableViewCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
    - a1
    - a2
  - b
    - =view
      - Table
    - b1
    - b2
  - c
    - =view
      - Table
    - c1
    - c2`)
  })

  it('toggles table view on nested thoughts', async () => {
    store.dispatch([
      importText({
        text: `
            - a
              - b
                - b1
                - b2
              - c
                - c1
                - c2
          `,
      }),
      setCursor(['a', 'b', 'b1']),
      addMulticursor(['a', 'b', 'b1']),
      addMulticursor(['a', 'c', 'c1']),
    ])

    executeCommandWithMulticursor(toggleTableViewCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
    - b
      - =view
        - Table
      - b1
      - b2
    - c
      - =view
        - Table
      - c1
      - c2`)
  })
})
