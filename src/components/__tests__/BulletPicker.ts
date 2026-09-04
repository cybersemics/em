import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('selecting Times applies =children/=bullet/Time with the default step and offers the step options', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - b
      `,
    }),
    setCursor(['a', 'b']),
  ])
  await act(vi.runOnlyPendingTimersAsync)

  await click('[data-testid="toolbar-icon"][aria-label="Bullet Style"]')
  await click('[aria-label="bullet style options"] [aria-label="Times"]')
  await act(vi.runOnlyPendingTimersAsync)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - =children
      - =bullet
        - Time
          - 15min
    - b`)

  // The picker stays open with the step options so that the step can be chosen during setup.
  expect(document.querySelector('[aria-label="time step options"]')).toBeInTheDocument()
})

it('selecting a step writes it under =children/=bullet/Time and closes the picker', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - =children
            - =bullet
              - Time
                - 15min
          - b
      `,
    }),
    setCursor(['a', 'b']),
  ])
  await act(vi.runOnlyPendingTimersAsync)

  await click('[data-testid="toolbar-icon"][aria-label="Bullet Style"]')
  await click('[aria-label="time step options"] [aria-label="30min"]')
  await act(vi.runOnlyPendingTimersAsync)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - =children
      - =bullet
        - Time
          - 30min
    - b`)

  expect(document.querySelector('[aria-label="bullet style options"]')).toBeNull()
})

it('reselecting Times on a Time list keeps its step', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - =children
            - =bullet
              - Time
                - 30min
          - b
      `,
    }),
    setCursor(['a', 'b']),
  ])
  await act(vi.runOnlyPendingTimersAsync)

  await click('[data-testid="toolbar-icon"][aria-label="Bullet Style"]')
  await click('[aria-label="bullet style options"] [aria-label="Times"]')
  await act(vi.runOnlyPendingTimersAsync)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - =children
      - =bullet
        - Time
          - 30min
    - b`)
})
