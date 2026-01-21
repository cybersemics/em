import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import pinCommand from '../pin'

beforeEach(initStore)

it('toggle on when there is no =pin attribute', () => {
  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - c
            - d
          - e
            - f
            - g
    `,
    }),
    setCursor(['a', 'b']),
  ])

  executeCommand(pinCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - b
      - =pin
      - c
      - d
    - e
      - f
      - g`)
})

it('toggle on when =pin/false', () => {
  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - =pin
              - false
            - c
            - d
          - e
            - f
            - g
    `,
    }),
    setCursor(['a', 'b']),
  ])

  executeCommand(pinCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - b
      - =pin
        - true
      - c
      - d
    - e
      - f
      - g`)
})

it('remove =pin when toggling off', () => {
  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - =pin
            - c
            - d
          - e
            - f
            - g
    `,
    }),
    setCursor(['a', 'b']),
  ])

  executeCommand(pinCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - b
      - c
      - d
    - e
      - f
      - g`)
})

it('remove =pin/true when toggling off', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - =pin
              - true
            - c
            - d
          - e
            - f
            - g
    `,
    }),
    setCursor(['a', 'b']),
  ])

  executeCommand(pinCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - b
      - c
      - d
    - e
      - f
      - g`)
})

describe('multicursor', () => {
  it('pins multiple thoughts', async () => {
    store.dispatch([
      importText({
        text: `
            - a
              - b
              - c
            - d
              - e
              - f
            - g
              - h
              - i
          `,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['d', 'e']),
      addMulticursor(['g']),
    ])

    executeCommandWithMulticursor(pinCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
    - b
      - =pin
    - c
  - d
    - e
      - =pin
    - f
  - g
    - =pin
    - h
    - i`)
  })

  it('toggles pin state for multiple thoughts', async () => {
    store.dispatch([
      importText({
        text: `
            - a
              - =pin
              - b
              - c
            - d
              - e
              - f
            - g
              - =pin
              - h
              - i
          `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['d', 'e']),
      addMulticursor(['g']),
    ])

    executeCommandWithMulticursor(pinCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
    - b
    - c
  - d
    - e
      - =pin
    - f
  - g
    - h
    - i`)
  })

  it('pins thoughts at different levels', async () => {
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
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['a', 'b', 'c']),
      addMulticursor(['d', 'e']),
    ])

    executeCommandWithMulticursor(pinCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
    - =pin
    - b
      - c
        - =pin
  - d
    - e
      - =pin
  - f`)
  })

  it('toggles pin state for thoughts with mixed initial states', async () => {
    store.dispatch([
      importText({
        text: `
            - a
              - =pin
              - b
            - c
              - =pin
            - d
              - e
          `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['c']),
      addMulticursor(['d', 'e']),
    ])

    executeCommandWithMulticursor(pinCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
    - b
  - c
  - d
    - e
      - =pin`)
  })

  it('handles nested thoughts correctly', async () => {
    store.dispatch([
      importText({
        text: `
            - a
              - b
                - c
              - d
            - e
              - f
                - g
          `,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['a', 'd']),
      addMulticursor(['e', 'f', 'g']),
    ])

    executeCommandWithMulticursor(pinCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a
    - b
      - =pin
      - c
    - d
      - =pin
  - e
    - f
      - g
        - =pin`)
  })
})
