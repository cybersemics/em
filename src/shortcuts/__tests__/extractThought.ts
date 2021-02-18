import { screen, findAllByPlaceholderText } from '@testing-library/react'
import { extractThought, newThought } from '../../action-creators'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import { findThoughtByText } from '../../test-helpers/queries'
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

  it('an alert should be shown if there is no selection', async () => {
    const thoughtValue = 'this is a thought'
    store.dispatch([
      newThought({ value: thoughtValue }),
      newThought({ value: 'sub-thought', insertNewSubthought: true }),
      setCursorFirstMatchActionCreator([thoughtValue])
    ])

    store.dispatch([extractThought()])

    const alert = await screen.findByText('No text selected to extract')
    expect(alert).toBeTruthy()

    const thought = await findThoughtByText(thoughtValue)
    expect(thought).toBeTruthy()
  })

  it('the selected part of a thought is extracted as a child thought', async () => {

    const thoughtValue = 'this is a thought'
    store.dispatch([
      newThought({ value: thoughtValue }),
      newThought({ value: 'sub-thought', insertNewSubthought: true }),
      setCursorFirstMatchActionCreator([thoughtValue])
    ])

    const thought = await findThoughtByText(thoughtValue)
    expect(thought).toBeTruthy()

    const selectedText = setSelection(thought!, 10, 17)
    store.dispatch([extractThought()])

    expect(thought?.textContent).toBe(thoughtValue.slice(0, 9))

    const createdThought = await findThoughtByText(selectedText)
    expect(createdThought).toBeTruthy()

    // created thought gets appended to the end
    const thoughtChildrenWrapper = thought!.closest('li')?.lastElementChild as HTMLElement
    const thoughtChildren = await findAllByPlaceholderText(thoughtChildrenWrapper, 'Add a thought')

    expect(thoughtChildren.map((child: HTMLElement) => child.textContent)).toMatchObject(['sub-thought', 'thought'])

  })

  it('the cursor does not get updated on child creation', async () => {
    const thoughtValue = 'this is a test thought'
    store.dispatch([
      newThought({ value: thoughtValue }),
      setCursorFirstMatchActionCreator([thoughtValue])
    ])

    const thought = await findThoughtByText(thoughtValue)
    expect(thought).toBeTruthy()

    const selectedText = setSelection(thought!, 10, 22)
    store.dispatch([extractThought()])

    const createdThought = await findThoughtByText(selectedText)
    expect(createdThought).toBeTruthy()

    expect(store.getState().cursor).toMatchObject([{ value: thoughtValue.slice(0, 9) }])

  })
})
