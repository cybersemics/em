import { findAllByLabelText, screen } from '@testing-library/react'
import { act } from 'react'
import { extractThoughtActionCreator as extractThought } from '../../actions/extractThought'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { initialize } from '../../initialize'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import store from '../../stores/app'
import createTestApp from '../../test-helpers/createTestApp'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import testTimer from '../../test-helpers/testTimer'

const timer = testTimer()

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

  it('an alert should be shown if there is no selection', async () => {
    const thoughtValue = 'this is a thought'
    store.dispatch([
      newThought({ value: thoughtValue }),
      newThought({ value: 'sub-thought', insertNewSubthought: true }),
      setCursor([thoughtValue]),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    store.dispatch(extractThought())
    await timer.runAllAsync()

    const alert = await screen.findByText('No text selected to extract')
    expect(alert).toBeTruthy()

    const thought = await findThoughtByText(thoughtValue)
    expect(thought).toBeTruthy()
  })

  it('the selected part of a thought is extracted as a child thought', async () => {
    initialize()
    await timer.runAllAsync()

    const thoughtValue = 'this is a thought'
    store.dispatch([
      newThought({ value: thoughtValue }),
      newThought({ value: 'sub-thought', insertNewSubthought: true }),
      setCursor([thoughtValue]),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const thought = await findThoughtByText(thoughtValue)
    expect(thought).toBeTruthy()

    const selectedText = setSelection(thought!, 10, 17)
    store.dispatch([extractThought()])
    await timer.runAllAsync()

    const updatedThought = await findThoughtByText(thoughtValue.slice(0, 9))
    expect(updatedThought?.textContent).toBeTruthy()

    const createdThought = await findThoughtByText(selectedText)
    expect(createdThought).toBeTruthy()

    // created thought gets appended to the end
    const thoughtChildrenWrapper = thought!.closest('div[aria-label=tree-node]')?.lastElementChild as HTMLElement
    const thoughtChildren = await findAllByLabelText(thoughtChildrenWrapper, 'thought')
    await timer.runAllAsync()

    expect(thoughtChildren.map((child: HTMLElement) => child.textContent)).toMatchObject(['this is a thought'])
  })

  it('the cursor does not get updated on child creation', async () => {
    const thoughtValue = 'this is a test thought'
    store.dispatch([newThought({ value: thoughtValue }), setCursor([thoughtValue])])

    await act(vi.runOnlyPendingTimersAsync)

    const thought = await findThoughtByText(thoughtValue)
    expect(thought).toBeTruthy()

    const selectedText = setSelection(thought!, 10, 22)
    store.dispatch([extractThought()])
    await timer.runAllAsync()

    const createdThought = await findThoughtByText(selectedText)
    expect(createdThought).toBeTruthy()

    const cursorThoughts = childIdsToThoughts(store.getState(), store.getState().cursor!)

    expect(cursorThoughts).toMatchObject([{ value: thoughtValue.slice(0, 9) }])
  })
})
