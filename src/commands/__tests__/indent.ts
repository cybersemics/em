import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import indentCommand from '../indent'

beforeEach(initStore)

describe('multicursor', () => {
  it('indents multiple thoughts', async () => {
    store.dispatch([
      importText({
        text: `
            - a
            - b
            - c
            - d
          `,
      }),
      setCursor(['b']),
      addMulticursor(['b']),
      addMulticursor(['c']),
    ])

    executeCommandWithMulticursor(indentCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
    - c
  - d`

    expect(exported).toEqual(expectedOutput)
  })

  it('indents thoughts at different levels', async () => {
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
      setCursor(['a', 'c']),
      addMulticursor(['a', 'c']),
      addMulticursor(['d', 'f']),
    ])

    executeCommandWithMulticursor(indentCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
      - c
  - d
    - e
      - f`

    expect(exported).toEqual(expectedOutput)
  })

  it('does not indent all thoughts on the same level', () => {
    store.dispatch([
      importText({
        text: `
            - a
              - b
              - c
            - d
          `,
      }),
      setCursor(['b']),
      addMulticursor(['b']),
      addMulticursor(['c']),
    ])

    executeCommandWithMulticursor(indentCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
    - c
  - d`

    expect(exported).toEqual(expectedOutput)
  })

  it('indents parent/child thoughts', () => {
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
      setCursor(['c']),
      addMulticursor(['c']),
      addMulticursor(['c', 'd']),
      addMulticursor(['e']),
    ])

    executeCommandWithMulticursor(indentCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
    - c
      - d
    - e
      - f`

    expect(exported).toEqual(expectedOutput)
  })
})
