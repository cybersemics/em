import { screen } from '@testing-library/react'
import { extractThought, newThought } from '../../action-creators'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'

/**
 * Set range selection.
 */
const setSelection = (element: HTMLElement, selectionStart: number, selectionEnd: number) => {
  const range = document.createRange()
  const sel = window.getSelection()

  range.setStart(element.childNodes[0], selectionStart)
  range.setEnd(element.childNodes[0], selectionEnd)

  sel?.removeAllRanges()
  sel?.addRange(range)

  return range.toString()
}

describe('Extract thought', () => {
  beforeEach(async () => {
    await createTestApp()
  })
  afterEach(cleanupTestApp)

  it('the selected part of a thought is extracted as a child thought', async () => {

    store.dispatch([
      newThought({ value: 'this is a thought' }),
      setCursorFirstMatchActionCreator(['this is a thought'])
    ])

    const thought = screen.queryAllByText('this is a thought')
    expect(thought).toHaveLength(2)
    const thoughtWrapper = thought[0]

    const selectedText = setSelection(thoughtWrapper, 10, 17)
    store.dispatch([extractThought()])

    const updatedThought = await screen.findAllByText(thoughtWrapper.textContent!.slice(0, 9), { exact: true })
    expect(updatedThought).toHaveLength(2)

    const createdThought = await screen.findAllByText(selectedText, { exact: true })
    expect(createdThought).toHaveLength(2)

  })

  it('the cursor does not get updated on child creation', async () => {
    store.dispatch([
      newThought({ value: 'this is a test thought' }),
      setCursorFirstMatchActionCreator(['this is a test thought'])
    ])

    const thought = await screen.findAllByText('this is a test thought')
    const thoughtEl = thought[0]

    const selectedText = setSelection(thoughtEl, 10, 22)
    store.dispatch([extractThought()])

    const createdThought = await screen.findAllByText(selectedText, { exact: true })
    expect(createdThought).toHaveLength(2)

    expect(store.getState().cursor).toMatchObject([{ value: thoughtEl.textContent!.slice(0, 9) }])

  })
})
