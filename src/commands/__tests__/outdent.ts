import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import outdentCommand from '../outdent'

beforeEach(initStore)

describe('multicursor', () => {
  it('outdents multiple thoughts', async () => {
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
      addMulticursor(['a', 'c']),
    ])

    executeCommandWithMulticursor(outdentCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    const expectedOutput = `- ${HOME_TOKEN}
  - a
  - b
  - c
  - d`

    expect(exported).toEqual(expectedOutput)
  })

  it('outdents thoughts at different levels', async () => {
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
      setCursor(['a', 'b', 'c']),
      addMulticursor(['a', 'b', 'c']),
      addMulticursor(['d', 'e', 'f']),
    ])

    executeCommandWithMulticursor(outdentCommand, { store })

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

  it('does not outdent thoughts already at the root level', () => {
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
      addMulticursor(['a', 'c']),
    ])

    executeCommandWithMulticursor(outdentCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    const expectedOutput = `- ${HOME_TOKEN}
  - a
  - b
  - c
  - d`

    expect(exported).toEqual(expectedOutput)
  })

  it('outdents parent/child thoughts', () => {
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
      addMulticursor(['a', 'c', 'd']),
      addMulticursor(['a', 'e']),
    ])

    executeCommandWithMulticursor(outdentCommand, { store })

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
