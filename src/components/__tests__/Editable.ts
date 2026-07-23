import { fireEvent } from '@testing-library/dom'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import SimplePath from '../../@types/SimplePath'
import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import * as selection from '../../device/selection'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { moveThoughtAtFirstMatchActionCreator as moveThought } from '../../test-helpers/moveThoughtAtFirstMatch'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import windowEvent from '../../test-helpers/windowEvent'
import Editable from '../Editable'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

// Using a clipboard app such as Paste for iOS or the built-in clipboard viewer on Android directly modifies the innerHTML and triggers an onChange event on the contenteditable.
it('"paste" from clipboard app into empty thought', async () => {
  act(() => {
    windowEvent('keydown', { key: 'Enter' })
  })

  const editable = (await findThoughtByText(''))!
  expect(editable).toBeVisible()

  // The clipboard app replaces plaintext newlines with divs.
  editable.innerHTML = '- a<div>  -b</div><div>    - c</div>'
  fireEvent.input(editable, { bubbles: true })
  await act(vi.runAllTimersAsync)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
      - c`)
})

it('"paste" from clipboard app into non-empty thought', async () => {
  act(() => {
    windowEvent('keydown', { key: 'Enter' })
  })

  const editable = (await findThoughtByText(''))!
  expect(editable).toBeVisible()

  const user = userEvent.setup({ delay: null })
  await user.type(editable, 'test')
  await act(vi.runAllTimersAsync)

  // The clipboard app appends the text to the existing content.
  editable.innerHTML = 'test- a<div>  -b</div><div>    - c</div>'
  fireEvent.input(editable, { bubbles: true })
  await act(vi.runAllTimersAsync)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- ${HOME_TOKEN}
  - test
    - a
      - b
        - c`)
})

it('inserts emoji spacing immediately and allows Backspace at the emoji boundary', async () => {
  act(() => {
    windowEvent('keydown', { key: 'Enter' })
  })

  const editable = (await findThoughtByText(''))!
  expect(editable).toBeVisible()

  editable.innerHTML = '🧠Hello'
  fireEvent.input(editable, { bubbles: true })
  expect(editable.textContent).toBe('🧠 Hello')

  const user = userEvent.setup({ delay: null })
  editable.focus()
  selection.set(editable, { offset: '🧠 '.length })
  await user.keyboard('{Backspace}')
  await act(vi.runAllTimersAsync)

  expect(editable.textContent).toBe('🧠Hello')
})

it.each<{ cursor: string[] | null; cursorName: string }>([
  { cursor: null, cursorName: 'null' },
  { cursor: ['A'], cursorName: 'parent' },
])('preserves a $cursorName cursor after a trailing click from a thought that has moved', async ({ cursor }) => {
  await dispatch(
    importText({
      text: `
        - A
          - B
          - C
          - D
      `,
    }),
  )
  await dispatch(setCursor(cursor))
  await act(vi.runOnlyPendingTimersAsync)

  const stalePath = contextToPath(store.getState(), ['A', 'B']) as SimplePath
  const cursorBefore = store.getState().cursor
  const { container } = render(
    createElement(Provider, {
      store,
      children: createElement(Editable, {
        isEditing: false,
        isVisible: true,
        path: stalePath,
        rank: 0,
        simplePath: stalePath,
      }),
    }),
  )
  const staleEditable = container.querySelector('[data-editable]')!

  await dispatch(
    moveThought({
      from: ['A', 'B'],
      to: ['A', 'C', 'B'],
      newRank: 0,
    }),
  )
  await act(() => fireEvent.click(staleEditable))

  expect(store.getState().cursor).toEqual(cursorBefore)
  await act(vi.runOnlyPendingTimersAsync)
})
