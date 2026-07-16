import { act } from 'react'
import getThoughtById from '../../selectors/getThoughtById'
import noteValue from '../../selectors/noteValue'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import getCommandState from '../../util/getCommandState'
import head from '../../util/head'
import { formatSelectionActionCreator as formatSelection } from '../formatSelection'
import { importTextActionCreator as importText } from '../importText'
import { newThoughtActionCreator as newThought } from '../newThought'
import { toggleNoteActionCreator as toggleNote } from '../toggleNote'

/**
 * These reproduce the formatting behaviors of the format.ts Puppeteer tests at the (cheaper) action level. This is now
 * possible because formatSelection computes the new HTML synchronously with the DOM (DOMParser/Range/TreeWalker, all
 * supported by JSDOM) rather than mutating a contentEditable via document.execCommand, which JSDOM does not implement (#4637).
 */

/** Returns the editable DOM element for the cursor thought. */
const getEditable = (): HTMLElement => {
  const state = store.getState()
  const id = head(state.cursor!)
  const editable = document.querySelector(`[aria-label="editable-${id}"]`)
  if (!editable) throw new Error(`Editable not found for thought ${id}`)
  return editable as HTMLElement
}

/** Returns the value of the cursor thought. */
const cursorValue = (): string => {
  const state = store.getState()
  return getThoughtById(state, head(state.cursor!))!.value
}

/** Selects the plain-text sub-range [start, end) of the cursor thought's editable. */
const selectRange = (start: number, end: number) => {
  const editable = getEditable()
  const textNode = editable.firstChild!
  const range = document.createRange()
  range.setStart(textNode, start)
  range.setEnd(textNode, end)
  const sel = window.getSelection()!
  sel.removeAllRanges()
  sel.addRange(range)
}

/** Selects the plain-text sub-range [start, end) of the cursor thought's editable, walking across nested formatting
 * nodes (unlike selectRange, which assumes a single text node). */
const selectPlainRange = (start: number, end: number) => {
  const editable = getEditable()
  const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT)
  let startNode: Node | null = null
  let startOffset = 0
  let endNode: Node | null = null
  let endOffset = 0
  let acc = 0
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const len = node.textContent?.length ?? 0
    if (!startNode && start <= acc + len) {
      startNode = node
      startOffset = start - acc
    }
    if (startNode && end <= acc + len) {
      endNode = node
      endOffset = end - acc
      break
    }
    acc += len
  }
  if (!startNode || !endNode) throw new Error('selectPlainRange: offsets out of bounds')
  const range = document.createRange()
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)
  const sel = window.getSelection()!
  sel.removeAllRanges()
  sel.addRange(range)
}

/** Places a collapsed caret at the start of the cursor thought's editable (formats the whole thought). */
const placeCaret = () => {
  const editable = getEditable()
  const range = document.createRange()
  range.selectNodeContents(editable)
  range.collapse(true)
  const sel = window.getSelection()!
  sel.removeAllRanges()
  sel.addRange(range)
}

/** Creates a single thought and puts the cursor on it. */
const setupThought = async (value: string) => {
  store.dispatch([newThought({ value }), setCursor([value])])
  await act(vi.runOnlyPendingTimersAsync)
}

/** Returns the note-editable DOM element for the cursor thought. */
const getNoteEditable = (): HTMLElement => {
  const state = store.getState()
  const id = head(state.cursor!)
  const editable = document.querySelector(`[aria-label="note-editable"][data-thought-id="${id}"]`)
  if (!editable) throw new Error(`Note editable not found for thought ${id}`)
  return editable as HTMLElement
}

/** Returns the value of the cursor thought's note. */
const noteVal = (): string | null => {
  const state = store.getState()
  return noteValue(state, state.cursor!)
}

/** Places a collapsed caret at the start of the cursor thought's note-editable (formats the whole note). */
const placeNoteCaret = () => {
  const editable = getNoteEditable()
  const range = document.createRange()
  range.selectNodeContents(editable)
  range.collapse(true)
  const sel = window.getSelection()!
  sel.removeAllRanges()
  sel.addRange(range)
}

/** Creates a thought "x" with a note, puts the cursor on the thought, and focuses the note. */
const setupNote = async (note: string) => {
  store.dispatch([
    importText({
      text: `
      - x
        - =note
          - ${note}`,
    }),
    setCursor(['x']),
    toggleNote(),
  ])
  await act(vi.runOnlyPendingTimersAsync)
}

describe('formatSelection', () => {
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  // Reproduces format.ts > "Apply formatting to a selected portion of a thought"
  it('applies formatting to a selected portion of a thought', async () => {
    await setupThought('Golden Retriever')

    // select the first word "Golden"
    selectRange(0, 'Golden'.length)
    store.dispatch(formatSelection('bold'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(cursorValue()).toBe('<b>Golden</b> Retriever')
  })

  // Reproduces the color portion of format.ts > "Apply text color to an uppercase formatting tag"
  it('applies a text color to the whole thought as a font tag', async () => {
    await setupThought('Hello World')

    placeCaret()
    store.dispatch(formatSelection('foreColor', 'blue'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(cursorValue()).toBe('<font color="#00c7e6">Hello World</font>')
  })

  // Reproduces the whole-thought formatting state relied on by format.ts > "Bold button stays active ... (#3912)"
  it('toggles whole-thought bold on and off', async () => {
    await setupThought('One')

    placeCaret()
    store.dispatch(formatSelection('bold'))
    await act(vi.runOnlyPendingTimersAsync)
    expect(cursorValue()).toBe('<b>One</b>')
    expect(getCommandState(cursorValue()).bold).toBe(true)

    placeCaret()
    store.dispatch(formatSelection('bold'))
    await act(vi.runOnlyPendingTimersAsync)
    expect(cursorValue()).toBe('One')
    expect(getCommandState(cursorValue()).bold).toBe(false)
  })

  // Reproduces the whole-thought formatting relied on by format.ts > "Clear Thought placeholder inherits ... (#4612)"
  it('applies multiple whole-thought formats', async () => {
    await setupThought('hello')

    store.dispatch(formatSelection('bold'))
    await act(vi.runOnlyPendingTimersAsync)

    store.dispatch(formatSelection('underline'))
    await act(vi.runOnlyPendingTimersAsync)

    const value = cursorValue()
    expect(value).toContain('<b>')
    expect(value).toContain('<u>')
    expect(value).toContain('hello')
  })

  it('removes formatting from the whole thought', async () => {
    await setupThought('goodbye')

    placeCaret()
    store.dispatch(formatSelection('bold'))
    await act(vi.runOnlyPendingTimersAsync)
    expect(cursorValue()).toBe('<b>goodbye</b>')

    placeCaret()
    store.dispatch(formatSelection('removeFormat'))
    await act(vi.runOnlyPendingTimersAsync)
    expect(cursorValue()).toBe('goodbye')
  })
})

/**
 * These reproduce the (thought-value) behaviors of the color.ts Puppeteer tests at the action level. Each color swatch
 * is a single formatSelection dispatch: a foreColor sets the text color and clears the background; a backColor sets the
 * background and forces a contrasting (black) text color. Deselecting a color applies the default foreground (#4637).
 * Assertions on the rendered bullet, superscript, context view, and letter case are UI-specific and remain in color.ts.
 */
describe('formatSelection color', () => {
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  // color.ts > "Set the text color of the text and bullet"
  it('sets the text color of the whole thought', async () => {
    await setupThought('Golden Retriever')

    placeCaret()
    store.dispatch(formatSelection('foreColor', 'blue'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(cursorValue()).toBe('<font color="#00c7e6">Golden Retriever</font>')
  })

  // color.ts > "Bullet remains the default color when a substring color is set" (value portion)
  it('sets the text color of a substring only', async () => {
    await setupThought('Golden Retriever')

    selectRange(0, 'Golden'.length)
    store.dispatch(formatSelection('foreColor', 'blue'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(cursorValue()).toBe('<font color="#00c7e6">Golden</font> Retriever')
  })

  // color.ts > "remove all formatting from the thought"
  it('removes all formatting from the thought', async () => {
    await setupThought('Labrador')

    for (const command of ['bold', 'italic', 'underline', 'strikethrough'] as const) {
      placeCaret()
      store.dispatch(formatSelection(command))
      await act(vi.runOnlyPendingTimersAsync)
    }
    placeCaret()
    store.dispatch(formatSelection('foreColor', 'blue'))
    await act(vi.runOnlyPendingTimersAsync)

    placeCaret()
    store.dispatch(formatSelection('removeFormat'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(cursorValue()).toBe('Labrador')
  })

  // color.ts > "Set the background color of the text"
  it('sets the background color of the whole thought', async () => {
    await setupThought('Golden Retriever')

    placeCaret()
    store.dispatch(formatSelection('backColor', 'green'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(cursorValue()).toBe(
      '<font color="#000000" style="background-color: rgb(0, 214, 136);">Golden Retriever</font>',
    )
  })

  // color.ts > "Clear the background color when selecting text color"
  it('clears the background color when selecting a text color', async () => {
    await setupThought('Golden Retriever')

    placeCaret()
    store.dispatch(formatSelection('backColor', 'green'))
    await act(vi.runOnlyPendingTimersAsync)

    placeCaret()
    store.dispatch(formatSelection('foreColor', 'purple'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(cursorValue()).toBe('<font color="#aa80ff">Golden Retriever</font>')
  })

  // color.ts > "Clear the text color when setting background color"
  it('clears the text color when setting a background color', async () => {
    await setupThought('Golden Retriever')

    placeCaret()
    store.dispatch(formatSelection('foreColor', 'green'))
    await act(vi.runOnlyPendingTimersAsync)

    placeCaret()
    store.dispatch(formatSelection('backColor', 'purple'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(cursorValue()).toBe(
      '<font color="#000000" style="background-color: rgb(170, 128, 255);">Golden Retriever</font>',
    )
  })

  // color.ts > "Empty <font> element will be removed after setting color to default."
  it('removes the font element when setting color to default', async () => {
    await setupThought('Golden Retriever')

    placeCaret()
    store.dispatch(formatSelection('foreColor', 'blue'))
    await act(vi.runOnlyPendingTimersAsync)

    placeCaret()
    store.dispatch(formatSelection('foreColor', 'fg'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(cursorValue()).toBe('Golden Retriever')
  })

  // color.ts > "Can change the color of a thought that already has the same color applied to part of its text"
  it('changes the color of a thought that already has the color on part of its text', async () => {
    await setupThought('some <font color="#ff573d">formatted</font> text')

    placeCaret()
    store.dispatch(formatSelection('foreColor', 'red'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(cursorValue()).toBe('<font color="#ff573d">some formatted text</font>')
  })

  // color.ts > "Can change the background color of a thought that already has the same background color applied to part of its text"
  it('changes the background color of a thought that already has the background on part of its text', async () => {
    await setupThought('some <font color="#000000" style="background-color: rgb(255, 87, 61);">formatted</font> text')

    placeCaret()
    store.dispatch(formatSelection('backColor', 'red'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(cursorValue()).toBe(
      '<font color="#000000" style="background-color: rgb(255, 87, 61);">some formatted text</font>',
    )
  })

  // undo.ts > "Should revert background color changes back to previous values" (the two-green markup that undo restores)
  it('applies a background color to two separate words as consolidated font tags', async () => {
    await setupThought('Lorem Ipsum Dolor Sit Amet')

    // green background on the first word "Lorem"
    selectPlainRange(0, 'Lorem'.length)
    store.dispatch(formatSelection('backColor', 'green'))
    await act(vi.runOnlyPendingTimersAsync)

    // green background on the last word "Amet"
    selectPlainRange('Lorem Ipsum Dolor Sit '.length, 'Lorem Ipsum Dolor Sit Amet'.length)
    store.dispatch(formatSelection('backColor', 'green'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(cursorValue()).toBe(
      '<font color="#000000" style="background-color: rgb(0, 214, 136);">Lorem</font> Ipsum Dolor Sit <font color="#000000" style="background-color: rgb(0, 214, 136);">Amet</font>',
    )
  })

  // overlapping partial background colors: green on "two three", then red on "One two" — the overlap ("two") takes the
  // most recent (red), leaving only " three" green
  it('applies overlapping partial background colors, most recent winning the overlap', async () => {
    await setupThought('One two three')

    // green background on "two three"
    selectPlainRange('One '.length, 'One two three'.length)
    store.dispatch(formatSelection('backColor', 'green'))
    await act(vi.runOnlyPendingTimersAsync)

    // red background on "One two"
    selectPlainRange(0, 'One two'.length)
    store.dispatch(formatSelection('backColor', 'red'))
    await act(vi.runOnlyPendingTimersAsync)

    // "One two" is red; " three" remains green
    expect(cursorValue()).toBe(
      '<font color="#000000" style="background-color: rgb(255, 87, 61);">One two</font><font color="#000000" style="background-color: rgb(0, 214, 136);"> three</font>',
    )
  })

  // a background color applied over a bold thought must keep both the <b> and the color <font>
  it('preserves bold when applying a background color to the whole thought', async () => {
    await setupThought('One')

    // bold the whole thought
    placeCaret()
    store.dispatch(formatSelection('bold'))
    await act(vi.runOnlyPendingTimersAsync)
    expect(cursorValue()).toBe('<b>One</b>')

    // apply a background color to the whole thought
    placeCaret()
    store.dispatch(formatSelection('backColor', 'green'))
    await act(vi.runOnlyPendingTimersAsync)

    const value = cursorValue()
    expect(value).toContain('<b>')
    expect(value).toContain('background-color: rgb(0, 214, 136)')
    expect(value).toBe('<font color="#000000" style="background-color: rgb(0, 214, 136);"><b>One</b></font>')
  })

  // #4265: applying a text color to a numeric thought that has a background color clears the background
  it('clears the background color of a numeric thought when applying a text color (#4265)', async () => {
    await setupThought('123')

    placeCaret()
    store.dispatch(formatSelection('backColor', 'green'))
    await act(vi.runOnlyPendingTimersAsync)

    placeCaret()
    store.dispatch(formatSelection('foreColor', 'blue'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(cursorValue()).toBe('<font color="#00c7e6">123</font>')
  })

  // #3877: an empty thought (e.g. one produced by splitting) should not accept a text/background color.
  it('does not apply a color to an empty thought (#3877)', async () => {
    store.dispatch(newThought({ value: '' }))
    await act(vi.runOnlyPendingTimersAsync)

    placeCaret()
    store.dispatch(formatSelection('backColor', 'green'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(cursorValue()).toBe('')
  })
})

describe('formatSelection note', () => {
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  // #4009 / color.ts > "Toggle the background color of the note" (intermediate): a note can be given a background color
  it('applies a background color to a note', async () => {
    await setupNote('Note')

    placeNoteCaret()
    store.dispatch(formatSelection('backColor', 'green'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(noteVal()).toBe('<font color="#000000" style="background-color: rgb(0, 214, 136);">Note</font>')
  })

  // #3901 / color.ts > "Toggling note background color on and off should remove formatting tag"
  it('removes the background color from a note when toggled off', async () => {
    await setupNote('Note')

    placeNoteCaret()
    store.dispatch(formatSelection('backColor', 'green'))
    await act(vi.runOnlyPendingTimersAsync)
    expect(noteVal()).toBe('<font color="#000000" style="background-color: rgb(0, 214, 136);">Note</font>')

    // deselecting a background applies the default note foreground, which clears the background
    placeNoteCaret()
    store.dispatch(formatSelection('foreColor', 'fgNote'))
    await act(vi.runOnlyPendingTimersAsync)
    expect(noteVal()).toBe('Note')
  })

  // #3901: setting a foreground color on a note that has a background color removes the background
  it('setting a note foreground color removes its background color', async () => {
    await setupNote('Note')

    placeNoteCaret()
    store.dispatch(formatSelection('backColor', 'green'))
    await act(vi.runOnlyPendingTimersAsync)

    placeNoteCaret()
    store.dispatch(formatSelection('foreColor', 'yellow'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(noteVal()).toBe('<font color="#ffd014">Note</font>')
  })
})
