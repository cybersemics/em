import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import bumpThoughtDown from '../../commands/bumpThoughtDown'
import { AlertType, HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('reset content editable inner html on bumpThoughtDown', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - b`,
    }),
    setCursor(['a']),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  expect(document.querySelector(`div[data-editable]`)?.textContent).toBe('a')

  await act(async () => {
    executeCommand(bumpThoughtDown)
  })

  await act(vi.runOnlyPendingTimersAsync)

  expect(document.querySelector(`div[data-editable]`)?.textContent).toBe('')
})

describe('multicursor', () => {
  // https://github.com/cybersemics/em/issues/3134
  it('bump the parent of the selected thoughts down and move the selected thoughts into it', async () => {
    await dispatch([
      importText({
        text: `
          - a
            - b
            - c
            - d
            - e
            - f`,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['a', 'c']),
      addMulticursor(['a', 'd']),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    await act(async () => {
      executeCommandWithMulticursor(bumpThoughtDown, { store })
    })

    await act(vi.runOnlyPendingTimersAsync)

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ${''}
    - a
      - b
      - c
      - d
    - e
    - f`)
  })

  it('bump a single selected thought down', async () => {
    await dispatch([
      importText({
        text: `
          - a
            - b
              - x
            - c`,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    await act(async () => {
      executeCommandWithMulticursor(bumpThoughtDown, { store })
    })

    await act(vi.runOnlyPendingTimersAsync)

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - ${''}
      - b
      - x
    - c`)
  })

  it('move the selected thoughts into a new empty thought when they are in the home context', async () => {
    await dispatch([
      importText({
        text: `
          - a
          - b
          - c`,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    await act(async () => {
      executeCommandWithMulticursor(bumpThoughtDown, { store })
    })

    await act(vi.runOnlyPendingTimersAsync)

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ${''}
    - a
    - b
  - c`)
  })

  it('disallow bumping down thoughts from different parents', async () => {
    await dispatch([
      importText({
        text: `
          - a
            - b
          - c
            - d`,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['c', 'd']),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    await act(async () => {
      executeCommandWithMulticursor(bumpThoughtDown, { store })
    })

    // assert the alert before the pending timers are run, since the alert is auto-dismissed after a delay
    expect(store.getState().alert).toMatchObject({
      alertType: AlertType.MulticursorError,
      value: 'Cannot bump down thoughts from different parents.',
    })

    await act(vi.runOnlyPendingTimersAsync)

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
  - c
    - d`)
  })
})
