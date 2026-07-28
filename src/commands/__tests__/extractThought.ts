import { findAllByLabelText, screen } from '@testing-library/react'
import { act } from 'react'
import { extractThoughtActionCreator as extractThought } from '../../actions/extractThought'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { setCursorActionCreator as setCursorThunk } from '../../actions/setCursor'
import { HOME_TOKEN } from '../../constants'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import { getAllChildrenAsThoughts } from '../../selectors/getChildren'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import head from '../../util/head'

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
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  it('an alert should be shown if there is no selection', async () => {
    const thoughtValue = 'this is a thought'
    await dispatch([
      newThought({ value: thoughtValue }),
      newThought({ value: 'sub-thought', insertNewSubthought: true }),
      setCursor([thoughtValue]),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    await dispatch(extractThought())

    const alert = await screen.findByText('No text selected to extract')
    expect(alert).toBeTruthy()

    const thought = await findThoughtByText(thoughtValue)
    expect(thought).toBeTruthy()
  })

  it('the selected part of a thought is extracted as a child thought', async () => {
    const thoughtValue = 'this is a thought'
    await dispatch([
      newThought({ value: thoughtValue }),
      newThought({ value: 'sub-thought', insertNewSubthought: true }),
      setCursor([thoughtValue]),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const thought = await findThoughtByText(thoughtValue)
    expect(thought).toBeTruthy()

    const selectedText = setSelection(thought!, 10, 17)
    await dispatch(extractThought())

    const updatedThought = await findThoughtByText(thoughtValue.slice(0, 9))
    expect(updatedThought?.textContent).toBeTruthy()

    const createdThought = await findThoughtByText(selectedText)
    expect(createdThought).toBeTruthy()

    // created thought gets appended to the end
    const thoughtChildrenWrapper = thought!.closest('div[aria-label=tree-node]')?.lastElementChild as HTMLElement
    const thoughtChildren = await findAllByLabelText(thoughtChildrenWrapper, 'thought')

    expect(thoughtChildren.map((child: HTMLElement) => child.textContent)).toMatchObject(['this is a'])
  })

  it('the cursor does not get updated on child creation', async () => {
    const thoughtValue = 'this is a test thought'
    await dispatch([newThought({ value: thoughtValue }), setCursor([thoughtValue])])

    await act(vi.runOnlyPendingTimersAsync)

    const thought = await findThoughtByText(thoughtValue)
    expect(thought).toBeTruthy()

    const selectedText = setSelection(thought!, 10, 22)
    await dispatch(extractThought())

    const createdThought = await findThoughtByText(selectedText)
    expect(createdThought).toBeTruthy()

    const cursorThoughts = childIdsToThoughts(store.getState(), store.getState().cursor!)

    expect(cursorThoughts).toMatchObject([{ value: thoughtValue.slice(0, 9) }])
  })

  // https://github.com/cybersemics/em/issues/4103
  it('formatting is preserved and html tags are not extracted as text', async () => {
    await dispatch(newThought({ value: '<font color="#ff573d">Lorem ipsum dolor</font>' }))

    await act(vi.runOnlyPendingTimersAsync)

    // the innermost element containing the text, i.e. the font tag within the thought, so that the selection is set on a text node
    const [formattedText] = (await screen.findAllByText('Lorem ipsum dolor', { exact: true })).filter(el =>
      el.closest('[contenteditable]'),
    )
    setSelection(formattedText, 0, 'Lorem ipsum'.length)

    await dispatch(extractThought())

    await act(vi.runOnlyPendingTimersAsync)

    const [updatedThought] = getAllChildrenAsThoughts(store.getState(), HOME_TOKEN)
    expect(updatedThought.value).toBe('<font color="#ff573d">dolor</font>')

    const [createdThought] = getAllChildrenAsThoughts(store.getState(), updatedThought.id)
    expect(createdThought.value).toBe('<font color="#ff573d">Lorem ipsum</font>')
  })

  // https://github.com/cybersemics/em/issues/4103
  it('formatting tags that become adjacent when the selection is removed are merged', async () => {
    await dispatch(newThought({ value: '<font color="#ff573d">Lorem ipsum dolor</font>' }))

    await act(vi.runOnlyPendingTimersAsync)

    const [formattedText] = (await screen.findAllByText('Lorem ipsum dolor', { exact: true })).filter(el =>
      el.closest('[contenteditable]'),
    )
    // select "ipsum " from the middle of the thought, so that the remaining text on either side of the selection is re-joined
    setSelection(formattedText, 'Lorem '.length, 'Lorem ipsum '.length)

    await dispatch(extractThought())

    await act(vi.runOnlyPendingTimersAsync)

    const [updatedThought] = getAllChildrenAsThoughts(store.getState(), HOME_TOKEN)
    expect(updatedThought.value).toBe('<font color="#ff573d">Lorem dolor</font>')

    const [createdThought] = getAllChildrenAsThoughts(store.getState(), updatedThought.id)
    expect(createdThought.value).toBe('<font color="#ff573d">ipsum</font>')
  })

  it('the cursor offset is placed where the extracted text was removed', async () => {
    await dispatch(newThought({ value: 'Lorem <b>ipsum</b> dolor' }))

    await act(vi.runOnlyPendingTimersAsync)

    // place the caret at the end of the thought
    await dispatch(setCursorThunk({ path: store.getState().cursor, offset: 'Lorem ipsum dolor'.length }))

    await act(vi.runOnlyPendingTimersAsync)

    const editable = await screen.findByLabelText(`editable-${head(store.getState().cursor!)}`)

    // select "ipsum ", which spans the bold tag and the text node that follows it
    const range = document.createRange()
    range.setStart(editable.childNodes[0], 'Lorem '.length)
    range.setEnd(editable.childNodes[2], 1)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)

    await dispatch(extractThought())

    await act(vi.runOnlyPendingTimersAsync)

    // the caret collapses to the start of the removed text, not to its former position at the end of the thought
    expect(store.getState().cursorOffset).toBe('Lorem '.length)
  })
})
