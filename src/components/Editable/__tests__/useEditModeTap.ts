import { fireEvent } from '@testing-library/react'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../../actions/keyboardOpen'
import * as selection from '../../../device/selection'
import store from '../../../stores/app'
import createTestApp, { cleanupTestApp } from '../../../test-helpers/createTestApp'
import { setCursorFirstMatchActionCreator as setCursor } from '../../../test-helpers/setCursorFirstMatch'
import headValue from '../../../util/headValue'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

/** The width of each character, and the height of each line, of a laid out editable. */
const CHAR_WIDTH = 10
const LINE_HEIGHT = 20

/** Returns the editable with the given text. */
const getEditable = (value: string) =>
  [...document.querySelectorAll<HTMLElement>('[data-editable]')].find(editable => editable.textContent === value)!

/**
 * Lays out the text of every editable on one line, CHAR_WIDTH per character, for the range geometry that getCaretOffset
 * hit-tests a click against and JSDOM does not implement.
 */
const layOutText = () => {
  /** Returns the rect of a range within a text node. */
  const rectOf = (range: Range) =>
    new DOMRect(range.startOffset * CHAR_WIDTH, 0, (range.endOffset - range.startOffset) * CHAR_WIDTH, LINE_HEIGHT)
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    configurable: true,
    /** Measures the range. */
    value(this: Range) {
      return rectOf(this)
    },
  })
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    /** Measures the range. */
    value(this: Range) {
      return [rectOf(this)]
    },
  })
  onTestFinished(() => {
    delete (Range.prototype as { getBoundingClientRect?: unknown }).getBoundingClientRect
    delete (Range.prototype as { getClientRects?: unknown }).getClientRects
  })
}

/** Presses the mouse on the given character offset of the editable. */
const mouseDownAt = async (editable: HTMLElement, offset: number) => {
  await act(async () => {
    // a little right of the character's left edge, so that the click resolves to the offset before it
    fireEvent.mouseDown(editable, { clientX: offset * CHAR_WIDTH + 2, clientY: LINE_HEIGHT / 2 })
  })
  await act(vi.runOnlyPendingTimersAsync)
}

it('places the caret where a click lands within the thought being edited', async () => {
  await act(async () => {
    store.dispatch([importText({ text: '- Hello world' }), setCursor(['Hello world']), keyboardOpen({ value: true })])
  })
  await act(vi.runOnlyPendingTimersAsync)
  layOutText()

  const editable = getEditable('Hello world')
  await mouseDownAt(editable, 'Hel'.length)

  expect(selection.offsetFromNode(editable)).toBe('Hel'.length)
  expect(store.getState().cursorOffset).toBe('Hel'.length)
})

it('places the caret where a click lands on another thought while editing', async () => {
  await act(async () => {
    store.dispatch([importText({ text: '- first\n- second' }), setCursor(['first']), keyboardOpen({ value: true })])
  })
  await act(vi.runOnlyPendingTimersAsync)
  layOutText()

  const editable = getEditable('second')
  await mouseDownAt(editable, 'sec'.length)

  expect(headValue(store.getState(), store.getState().cursor!)).toBe('second')
  expect(selection.offsetFromNode(editable)).toBe('sec'.length)
  expect(store.getState().cursorOffset).toBe('sec'.length)
  expect(store.getState().isKeyboardOpen).toBe(true)
})

it('keeps the offset of the click when the placement focuses the thought', async () => {
  await act(async () => {
    store.dispatch([importText({ text: '- Hello world' }), setCursor(['Hello world'])])
  })
  await act(vi.runOnlyPendingTimersAsync)
  layOutText()

  const editable = getEditable('Hello world')
  await mouseDownAt(editable, 'Hel'.length)
  // Editable's onFocus sets the cursor with no offset unless edit mode is already on
  await act(async () => {
    fireEvent.focus(editable)
  })
  await act(vi.runOnlyPendingTimersAsync)

  expect(selection.offsetFromNode(editable)).toBe('Hel'.length)
  expect(store.getState().cursorOffset).toBe('Hel'.length)
})

it('leaves the Command Center open when a click places the caret', async () => {
  await act(async () => {
    store.dispatch([importText({ text: '- Hello world' }), setCursor(['Hello world'])])
    store.dispatch({ type: 'toggleDropdown', dropDownType: 'commandCenter', value: true })
  })
  await act(vi.runOnlyPendingTimersAsync)
  layOutText()

  await mouseDownAt(getEditable('Hello world'), 'Hel'.length)

  expect(store.getState().showCommandCenter).toBe(true)
})
