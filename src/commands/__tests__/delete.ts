import { screen } from '@testing-library/dom'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import executeCommand, { executeCommandWithMulticursor } from '../../util/executeCommand'
import deleteCommand from '../delete'

beforeEach(initStore)

describe('delete', () => {
  describe('DOM', () => {
    beforeEach(createTestApp)
    afterEach(cleanupTestApp)

    it('strip formatting in alert', async () => {
      vi.useFakeTimers()
      await act(async () => {
        store.dispatch([
          importText({
            text: `
          - <b>test</b>
        `,
          }),
          setCursor(['<b>test</b>']),
        ])
      })

      await act(vi.runOnlyPendingTimersAsync)

      act(() => executeCommand(deleteCommand, { store }))

      await act(vi.runAllTimersAsync)

      const popupValue = await screen.findByTestId('alert-content')!
      expect(popupValue.textContent).toBe('Permanently deleted test')
    })
  })

  describe('multicursor', () => {
    it('deletes multiple thoughts', async () => {
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

      executeCommandWithMulticursor(deleteCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
  - d`

      expect(exported).toEqual(expectedOutput)
    })

    it('deletes thoughts at different levels', async () => {
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
        addMulticursor(['d', 'f']),
      ])

      executeCommandWithMulticursor(deleteCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
    - c
  - d
    - e`

      expect(exported).toEqual(expectedOutput)
    })

    it('does not delete read-only thoughts', async () => {
      store.dispatch([
        importText({
          text: `
            - a
              - =readonly
            - b
            - c
              - =readonly
          `,
        }),
        setCursor(['a']),
        addMulticursor(['a']),
        addMulticursor(['c']),
      ])

      executeCommandWithMulticursor(deleteCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

      const expectedOutput = `- ${HOME_TOKEN}
  - a
    - =readonly
  - b
  - c
    - =readonly`

      expect(exported).toEqual(expectedOutput)
    })
  })
})
