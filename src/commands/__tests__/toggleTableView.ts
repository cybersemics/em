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

it('toggle off table view of parent of cursor', () => {
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
  it('toggles table view once when multiple selected thoughts share a parent', () => {
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
      addMulticursor(['a', 'd']),
    ])

    executeCommandWithMulticursor(toggleTableViewCommand, { store })

    expect(attributeByContext(store.getState(), ['a'], '=view')).toBe('Table')
  })

  it('toggles table view off once when multiple selected thoughts share a parent', () => {
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
      addMulticursor(['a', 'b']),
      addMulticursor(['a', 'd']),
    ])

    executeCommandWithMulticursor(toggleTableViewCommand, { store })

    expect(attributeByContext(store.getState(), ['a'], '=view')).toBe(null)
  })

  it('toggles table view once for each parent with multiple selected children', () => {
    store.dispatch([
      importText({
        text: `
            - a
              - a1
              - a2
            - b
              - b1
              - b2
          `,
      }),
      setCursor(['a', 'a1']),
      addMulticursor(['a', 'a1']),
      addMulticursor(['a', 'a2']),
      addMulticursor(['b', 'b1']),
      addMulticursor(['b', 'b2']),
    ])

    executeCommandWithMulticursor(toggleTableViewCommand, { store })

    expect(attributeByContext(store.getState(), ['a'], '=view')).toBe('Table')
    expect(attributeByContext(store.getState(), ['b'], '=view')).toBe('Table')
  })

  it('toggles table view for selections at different depths', () => {
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
      addMulticursor(['a', 'd', 'e']),
    ])

    executeCommandWithMulticursor(toggleTableViewCommand, { store })

    expect(attributeByContext(store.getState(), ['a'], '=view')).toBe('Table')
    expect(attributeByContext(store.getState(), ['a', 'd'], '=view')).toBe('Table')
  })

  it('toggles table view on for multiple thoughts', () => {
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
    expect(exported).toBe(`- ${HOME_TOKEN}
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

  it('handles mixed scenarios with table view on and off', () => {
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
    expect(exported).toBe(`- ${HOME_TOKEN}
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

  it('toggles table view on nested thoughts', () => {
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
    expect(exported).toBe(`- ${HOME_TOKEN}
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
