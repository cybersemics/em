import { screen, findAllByText, findAllByPlaceholderText } from '@testing-library/react'
import { extractThought, newThought } from '../../action-creators'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
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
    store.dispatch([
      newThought({ value: 'this is a thought' }),
      newThought({ value: 'sub-thought', insertNewSubthought: true }),
      setCursorFirstMatchActionCreator(['this is a thought'])
    ])

    store.dispatch([extractThought()])

    const alert = await screen.findByText('No text selected to extract')
    expect(alert).toBeTruthy()

    const [thought] = await screen.findAllByText('this is a thought', { selector: 'div' })
    expect(thought).toBeTruthy()
  })

  it('the selected part of a thought is extracted as a child thought', async () => {

    store.dispatch([
      newThought({ value: 'this is a thought' }),
      newThought({ value: 'sub-thought', insertNewSubthought: true }),
      setCursorFirstMatchActionCreator(['this is a thought'])
    ])

    const [thought] = await screen.findAllByText('this is a thought', { selector: 'div' })
    expect(thought).toBeTruthy()

    const selectedText = setSelection(thought, 10, 17)
    store.dispatch([extractThought()])

    const updatedThought = await findAllByText(thought, thought.textContent!.slice(0, 9), { exact: true })
    expect(updatedThought).toHaveLength(1)

    const createdThought = await screen.findAllByText(selectedText, { exact: true, selector: 'div' })
    expect(createdThought).toHaveLength(1)

    // created thought gets appended to the end
    const thoughtChildrenWrapper = thought.closest('li')?.lastElementChild as HTMLElement
    const thoughtChildren = await findAllByPlaceholderText(thoughtChildrenWrapper, 'Add a thought')

    expect(thoughtChildren.map((child: HTMLElement) => child.textContent)).toMatchObject(['sub-thought', 'thought'])

  })

  it('the cursor does not get updated on child creation', async () => {
    store.dispatch([
      newThought({ value: 'this is a test thought' }),
      setCursorFirstMatchActionCreator(['this is a test thought'])
    ])

    const [thought] = await screen.findAllByText('this is a test thought', { selector: 'div' })
    expect(thought).toBeTruthy()

    const selectedText = setSelection(thought, 10, 22)
    store.dispatch([extractThought()])

    const createdThought = await screen.findAllByText(selectedText, { exact: true, selector: 'div' })
    expect(createdThought).toHaveLength(1)

    expect(store.getState().cursor).toMatchObject([{ value: thought.textContent!.slice(0, 9) }])

  })
})
