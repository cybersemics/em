import { KnownDevices } from 'puppeteer'
import clearThoughtCommand from '../../../commands/clearThought'
import click from '../helpers/click'
import emulate from '../helpers/emulate'
import gesture from '../helpers/gesture'
import getSelection from '../helpers/getSelection'
import longPressThought from '../helpers/longPressThought'
import multiselectThoughts from '../helpers/multiselectThoughts'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Executes Clear Thought (→←) with its keyboard shortcut. The command helper is not used because it executes the
 * command directly, bypassing the multicursor execution that this test exercises. */
const clearThought = () => press('c', { alt: true, shift: true, meta: true })

/** Reads the innerHTML of every rendered thought. */
const editableValues = () => page.$$eval('[data-editable]', els => els.map(el => el.innerHTML))

/** Waits for the first thought to render the given value. Since an edit is mirrored to the other selected thoughts in
 * the same dispatch, they render it in the same frame. */
const waitForFirstEditable = (value: string) =>
  page.waitForFunction(value => document.querySelector('[data-editable]')?.innerHTML === value, {}, value)

/** Waits until no thoughts are rendered. */
const waitForNoEditables = () => page.waitForFunction(() => !document.querySelector('[data-editable]'))

/** Returns the index of the thought that holds the real caret, or -1 if no thought is being edited. */
const editingIndex = () =>
  page.evaluate(() => {
    const editables = Array.from(document.querySelectorAll('[data-editable]'))
    const editing = document.querySelector('[data-editing=true] [data-editable]')
    return editing ? editables.indexOf(editing) : -1
  })

/** Waits a single animation frame, i.e. long enough for the faux carets to be repositioned after an edit. */
const nextFrame = () => page.evaluate(() => new Promise(requestAnimationFrame))

/** Returns the number of thoughts whose bullet is highlighted, i.e. the size of the multiselection. */
const multiselectSize = () => page.$$eval('[aria-label="bullet"][data-highlighted="true"]', els => els.length)

/** Waits until the real caret sits at the given plain-text offset within the thought that holds it. The offset is
 * measured from the rendered text rather than the selection's focusOffset, which is relative to the focus node and so
 * differs between a text-node and an element-node selection. */
const waitForCaretTextOffset = (offset: number) =>
  page.waitForFunction(
    (offset: number) => {
      const selection = window.getSelection()
      const editing = document.querySelector('[data-editing=true] [data-editable]')
      if (!selection?.rangeCount || !editing) return false
      const range = selection.getRangeAt(0)
      if (!editing.contains(range.startContainer)) return false
      const before = document.createRange()
      before.setStart(editing, 0)
      before.setEnd(range.startContainer, range.startOffset)
      return before.toString().length === offset
    },
    {},
    offset,
  )

/** Returns the position of the real caret relative to the thought that holds it, and of each faux caret relative to the
 * thought it overlays. Rounded to the nearest pixel to allow for sub-pixel layout differences. */
const caretOffsets = () =>
  page.evaluate(() => {
    /** Returns the position of a caret rect relative to the thought it belongs to. */
    const relativeTo = (rect: DOMRect, editable: Element) => {
      const { x, y } = editable.getBoundingClientRect()
      return { x: Math.round(rect.x - x), y: Math.round(rect.y - y) }
    }
    const selection = window.getSelection()
    const realRect = selection?.rangeCount ? selection.getRangeAt(0).getBoundingClientRect() : null
    return {
      real: realRect?.height ? relativeTo(realRect, document.activeElement!) : null,
      faux: Array.from(document.querySelectorAll('[data-testid="faux-caret-multicursor"]')).map(el =>
        relativeTo(el.getBoundingClientRect(), el.parentElement!.querySelector('[data-editable]')!),
      ),
    }
  })

/** Returns the height of each faux caret alongside the height of the thought it overlays. */
const fauxCaretHeights = () =>
  page.$$eval('[data-testid="faux-caret-multicursor"]', els =>
    els.map(el => ({
      caret: el.getBoundingClientRect().height,
      editable: el.parentElement!.querySelector('[data-editable]')!.getBoundingClientRect().height,
    })),
  )

describe('clearThought', () => {
  // Regression test for https://github.com/cybersemics/em/issues/4519
  it('clears all multiselected thoughts and mirrors typing across them', async () => {
    await paste(`
      - a
      - b
      - c
    `)

    await waitForEditable('a')
    await waitForEditable('b')
    await waitForEditable('c')

    await multiselectThoughts(['a', 'b', 'c'])

    await clearThought()

    // All three multiselected thoughts are cleared, i.e. rendered as empty placeholders.
    await waitForFirstEditable('')
    expect(await editableValues()).toEqual(['', '', ''])

    // The real caret is on the first thought and a faux caret is rendered on the other two.
    expect(await editingIndex()).toBe(0)
    expect((await caretOffsets()).faux).toHaveLength(2)

    // Typing mirrors the new value across all cleared thoughts in real-time.
    await page.keyboard.type('hello')
    await waitForFirstEditable('hello')
    expect(await editableValues()).toEqual(['hello', 'hello', 'hello'])

    // Backspace deletes a character rather than the thoughts, and the deletion mirrors like any other edit.
    await page.keyboard.press('Backspace')
    await waitForFirstEditable('hell')
    expect(await editableValues()).toEqual(['hell', 'hell', 'hell'])

    // The faux carets are rendered at the same position within their thought as the real caret is within its own.
    await nextFrame()
    const carets = await caretOffsets()
    expect(carets.real).not.toBeNull()
    expect(carets.faux).toEqual([carets.real, carets.real])
  })

  // Regression test for https://github.com/cybersemics/em/issues/4519
  it('renders the faux carets at the real caret position when the edited value has a trailing space', async () => {
    await paste(`
      - a
      - b
      - c
    `)

    await waitForEditable('a')
    await waitForEditable('b')
    await waitForEditable('c')

    await multiselectThoughts(['a', 'b', 'c'])

    await clearThought()
    await waitForFirstEditable('')

    // The mirrored value is trimmed, so the faux carets must be positioned from the real caret rather than from the
    // value rendered beneath them.
    await page.keyboard.type('hello ')
    await nextFrame()

    const carets = await caretOffsets()
    expect(carets.real).not.toBeNull()
    expect(carets.faux).toEqual([carets.real, carets.real])
  })

  // Regression test for https://github.com/cybersemics/em/issues/4519
  it('moves the caret to the tapped position without dismissing the multiselection', async () => {
    await paste(`
      - a
      - b
      - c
    `)

    await waitForEditable('a')
    await waitForEditable('b')
    await waitForEditable('c')

    await multiselectThoughts(['a', 'b', 'c'])

    await clearThought()
    await waitForFirstEditable('')

    await page.keyboard.type('hello')
    await waitForFirstEditable('hello')

    // Tapping another selected thought moves the caret there, as it would when editing a single thought. The thought is
    // addressed by index since every selected thought renders the same mirrored value.
    await click((await page.$$('[data-editable]'))[1], { offset: 2 })

    expect(await editingIndex()).toBe(1)
    expect(await getSelection().focusOffset).toBe(2)
    expect(await multiselectSize()).toBe(3)
  })

  // https://github.com/cybersemics/em/pull/4520#issuecomment-5185543013
  it('moves the faux carets to the end of the thought when the end is tapped', async () => {
    await paste(`
      - a
      - b
      - c
    `)

    await waitForEditable('a')
    await waitForEditable('b')
    await waitForEditable('c')

    await multiselectThoughts(['a', 'b', 'c'])

    await clearThought()
    await waitForFirstEditable('')

    await page.keyboard.type('hello')
    await waitForFirstEditable('hello')

    // Typing leaves the carets at the end of the text; capture their position as the reference for the tap below.
    await nextFrame()
    const caretsAfterTyping = await caretOffsets()
    expect(caretsAfterTyping.faux).toHaveLength(2)

    // The thought is addressed by index since every selected thought renders the same mirrored value.
    const editable = (await page.$$('[data-editable]'))[0]

    // Tap the beginning of the thought, then the end.
    await click(editable)
    await waitForCaretTextOffset(0)
    await click(editable, { offset: 5 })
    await waitForCaretTextOffset(5)

    // The faux carets follow the real caret back to the end of the thought.
    await nextFrame()
    expect((await caretOffsets()).faux).toEqual(caretsAfterTyping.faux)
  })

  // Regression test for https://github.com/cybersemics/em/issues/4519
  it('exits Clear Thought on Escape and clears the multiselection on the second Escape', async () => {
    await paste(`
      - a
      - b
      - c
    `)

    await waitForEditable('a')
    await waitForEditable('b')
    await waitForEditable('c')

    await multiselectThoughts(['a', 'b', 'c'])

    await clearThought()
    await waitForFirstEditable('')

    // The first Escape restores the cleared values and keeps the thoughts selected.
    await press('Escape')
    await waitForFirstEditable('a')
    expect(await editableValues()).toEqual(['a', 'b', 'c'])
    expect(await multiselectSize()).toBe(3)

    // The second Escape clears the multiselection.
    await press('Escape')
    await page.waitForFunction(() => !document.querySelector('[aria-label="bullet"][data-highlighted="true"]'))
  })

  // https://github.com/cybersemics/em/pull/4520#issuecomment-5186050473
  it('keeps the multiselection when Escape is pressed after typing into the cleared thoughts', async () => {
    await paste(`
      - a
      - b
      - c
    `)

    await waitForEditable('a')
    await waitForEditable('b')
    await waitForEditable('c')

    await multiselectThoughts(['a', 'b', 'c'])

    await clearThought()
    await waitForFirstEditable('')

    await page.keyboard.type('hello')
    await waitForFirstEditable('hello')

    // The first Escape exits edit mode while keeping the typed value and the multiselection. Wait for either visible
    // response to the keypress — the caret leaving the thought, or a change in the number of selected bullets — so that
    // the multiselection can be asserted at a point where the wrong behavior would already have manifested.
    await press('Escape')
    await page.waitForFunction(() => {
      const noCaret = !window.getSelection()?.rangeCount
      const noHighlight = !document.querySelector('[aria-label="bullet"][data-highlighted="true"]')
      return noCaret || noHighlight
    })
    expect(await editableValues()).toEqual(['hello', 'hello', 'hello'])
    expect(await multiselectSize()).toBe(3)

    // The second Escape clears the multiselection.
    await press('Escape')
    await page.waitForFunction(() => !document.querySelector('[aria-label="bullet"][data-highlighted="true"]'))
  })

  // https://github.com/cybersemics/em/pull/4520#issuecomment-5255961961
  it('moves the faux carets back to the real caret when the edit is undone', async () => {
    await paste(`
      - a
      - b
      - c
    `)

    await waitForEditable('a')
    await waitForEditable('b')
    await waitForEditable('c')

    await multiselectThoughts(['a', 'b', 'c'])

    await clearThought()
    await waitForFirstEditable('')

    // The caret is at the beginning of the cleared thoughts; capture the faux caret positions as the reference for the
    // undo below, which restores the caret to the beginning as well.
    await nextFrame()
    const caretsCleared = await caretOffsets()
    expect(caretsCleared.faux).toHaveLength(2)

    await page.keyboard.type('hello world')
    await waitForFirstEditable('hello world')

    // Undo replaces the rendered text without a selectionchange or input event, so the faux carets must be re-measured
    // rather than left at the offset of the text that was replaced. Contiguous insertions merge into a single undo
    // step, so the whole typed run is reverted and the first thought renders its original value again.
    await press('z', { meta: true })
    await waitForFirstEditable('a')
    await waitForCaretTextOffset(0)

    await nextFrame()
    expect((await caretOffsets()).faux.map(caret => caret.x)).toEqual(caretsCleared.faux.map(caret => caret.x))
  })

  // https://github.com/cybersemics/em/pull/4520#issuecomment-5262417060
  it('renders the faux carets at a single line height when the first thought wraps onto several lines', async () => {
    const multiline = 'this is a long thought that wraps onto several lines when it is rendered on a narrow screen'

    await paste(`
      - ${multiline}
      - b
      - c
    `)

    await waitForEditable(multiline)
    await waitForEditable('b')
    await waitForEditable('c')

    await multiselectThoughts([multiline, 'b', 'c'])

    await clearThought()
    await waitForFirstEditable('')

    // A cleared thought renders its value as a placeholder, so the first thought is still several lines tall. The faux
    // carets take their height from the real caret, which is one line tall, not from the thought that holds it.
    await nextFrame()
    const heights = await fauxCaretHeights()
    expect(heights).toHaveLength(2)
    heights.forEach(({ caret, editable }) => expect(caret).toBeLessThanOrEqual(editable))
  })

  // Regression test for https://github.com/cybersemics/em/issues/4519
  it('deletes all multiselected thoughts when Backspace is pressed on the cleared thoughts', async () => {
    await paste(`
      - a
      - b
      - c
    `)

    await waitForEditable('a')
    await waitForEditable('b')
    await waitForEditable('c')

    await multiselectThoughts(['a', 'b', 'c'])

    await clearThought()
    await waitForFirstEditable('')

    expect(await editableValues()).toEqual(['', '', ''])

    // Backspace on the cleared thoughts deletes every selected thought, rather than merging them or deleting only the
    // one that holds the caret.
    await press('Backspace')
    await waitForNoEditables()
  })
})

describe('mobile', () => {
  beforeEach(async () => {
    await emulate(KnownDevices['iPhone 15 Pro'])
  }, 10000)

  // https://github.com/cybersemics/em/pull/4520
  it('dismisses the Command Center and mirrors typing when Clear Thought is performed on a multiselection', async () => {
    await paste(`
      - a
      - b
      - c
    `)

    const a = await waitForEditable('a')
    const b = await waitForEditable('b')
    const c = await waitForEditable('c')

    await longPressThought(a, { edge: 'right' })
    await longPressThought(b, { edge: 'right' })
    await longPressThought(c, { edge: 'right' })

    // Wait for the Command Center to reflect the full selection before acting (see multiselect.ts).
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid=command-center-panel]')?.textContent?.includes('3 thoughts selected') ??
        false,
      { timeout: 6000 },
    )

    await gesture(clearThoughtCommand)

    // The Command Center sheet is dismissed so the keyboard has the screen. The sheet's container unmounts when it
    // closes, while the multiselection stays active.
    await page.waitForFunction(() => !document.querySelector('[data-testid=command-menu-panel]'))

    // All three thoughts are cleared and still selected.
    await waitForFirstEditable('')
    expect(await editableValues()).toEqual(['', '', ''])
    expect(await multiselectSize()).toBe(3)

    // Typing mirrors the new value across all selected thoughts, so the keyboard is functional while the
    // multiselection is active.
    await page.keyboard.type('hello')
    await waitForFirstEditable('hello')
    expect(await editableValues()).toEqual(['hello', 'hello', 'hello'])
    expect(await multiselectSize()).toBe(3)
  })
})
