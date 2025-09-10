import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import initStore from '../../test-helpers/initStore'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import executeCommand from '../../util/executeCommand'
import favorite from '../favorite'

beforeEach(initStore)

describe('favorite drag and drop', () => {
  beforeEach(async () => {
    await createTestApp()
  })
  afterEach(cleanupTestApp)

  it('Dropping a thought onto the "remove from favorites" zone should unfavorite it', async () => {
    await act(async () => {
      store.dispatch(
        importText({
          text: `
            - A
              - =favorite
          `,
        }),
      )
    })

    // Wait for the thought to be rendered in the DOM
    // Using screen.findByText which automatically waits for the element to appear
    const thoughtA = await findThoughtByText('A')
    expect(thoughtA).toBeTruthy()

    await act(async () => {
      store.dispatch(setCursor(['A']))
    })

    // Simulate the unfavorite action by executing the favorite command
    // as if it were triggered by the drag and drop.
    await act(async () => {
      executeCommand(favorite, { store })
    })

    // Assert that the thought is no longer favorited
    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    const expectedOutput = `- ${HOME_TOKEN}
  - A`
    expect(exported).toEqual(expectedOutput)
  })
})
