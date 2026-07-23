import { act } from 'react'
import { UnknownAction } from 'redux'
import Thunk from '../../@types/Thunk'
import { formatLetterCaseActionCreator as formatLetterCase } from '../../actions/formatLetterCase'
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

/** Dispatches an action (or array of actions) wrapped in act(), then flushes pending timers, so the React state updates
 * triggered by the dispatch (e.g. NavBar re-rendering on a cursor change) are wrapped in act() as React requires. */
const dispatch = async (action: Thunk[] | Thunk | UnknownAction) => {
  act(() => {
    store.dispatch(Array.isArray(action) ? action : [action])
  })
  await act(vi.runOnlyPendingTimersAsync)
}

/** Creates a single thought and puts the cursor on it. */
const setupThought = async (value: string) => {
  await dispatch([newThought({ value }), setCursor([value])])
}

/** Returns the value of the cursor thought's note. */
const noteVal = (): string | null => {
  const state = store.getState()
  return noteValue(state, state.cursor!)
}

/** Creates a thought "x" with a note, puts the cursor on the thought, and focuses the note. */
const setupNote = async (note: string) => {
  await dispatch([
    importText({
      text: `
      - x
        - =note
          - ${note}`,
    }),
    setCursor(['x']),
    toggleNote(),
  ])
}

describe('formatSelection', () => {
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  // Reproduces format.ts > "Apply formatting to a selected portion of a thought"
  it('applies formatting to a selected portion of a thought', async () => {
    await setupThought('Golden Retriever')

    // select the first word "Golden"
    selectRange(0, 'Golden'.length)
    await dispatch(formatSelection('bold'))

    expect(cursorValue()).toBe('<b>Golden</b> Retriever')
  })

  // Reproduces format.ts > "Apply text color to an uppercase formatting tag"
  it('applies a text color to the whole thought as a font tag', async () => {
    await setupThought('Hello World')

    await dispatch([formatLetterCase('UpperCase'), formatSelection('foreColor', 'blue')])

    expect(cursorValue()).toBe('<font color="#00c7e6">HELLO WORLD</font>')
  })

  it('toggles whole-thought bold on and off', async () => {
    await setupThought('One')

    await dispatch(formatSelection('bold'))
    expect(cursorValue()).toBe('<b>One</b>')
    expect(getCommandState(cursorValue()).bold).toBe(true)

    await dispatch(formatSelection('bold'))
    expect(cursorValue()).toBe('One')
    expect(getCommandState(cursorValue()).bold).toBe(false)
  })

  it('applies multiple whole-thought formats', async () => {
    await setupThought('hello')

    await dispatch(formatSelection('bold'))

    await dispatch(formatSelection('underline'))

    const value = cursorValue()
    expect(value).toContain('<b>')
    expect(value).toContain('<u>')
    expect(value).toContain('hello')
  })

  it('applies bold to the whole thought after bolding a substring, without nesting', async () => {
    await setupThought('Hello Bold World')

    // bold just "Bold"
    selectRange('Hello '.length, 'Hello Bold'.length)
    await dispatch(formatSelection('bold'))
    expect(cursorValue()).toBe('Hello <b>Bold</b> World')

    // bold the entire thought
    selectPlainRange(0, 'Hello Bold World'.length)
    await dispatch(formatSelection('bold'))
    expect(cursorValue()).toBe('<b>Hello Bold World</b>')
  })

  it('bolds a range overlapping an existing bold substring, without nesting', async () => {
    await setupThought('Hello Bold World')

    // bold just "Bold"
    selectRange('Hello '.length, 'Hello Bold'.length)
    await dispatch(formatSelection('bold'))
    expect(cursorValue()).toBe('Hello <b>Bold</b> World')

    // bold "Bold World", which overlaps the existing bold on "Bold"
    selectPlainRange('Hello '.length, 'Hello Bold World'.length)
    await dispatch(formatSelection('bold'))
    expect(cursorValue()).toBe('Hello <b>Bold World</b>')
  })

  it('unbolds a substring when bolding the same range twice', async () => {
    await setupThought('Hello World')

    // bold "World"
    selectRange('Hello '.length, 'Hello World'.length)
    await dispatch(formatSelection('bold'))
    expect(cursorValue()).toBe('Hello <b>World</b>')

    // re-select the same range and bold again → the bold should toggle off
    selectPlainRange('Hello '.length, 'Hello World'.length)
    await dispatch(formatSelection('bold'))
    expect(cursorValue()).toBe('Hello World')
  })

  it('unbolds a sub-range of an existing bold substring', async () => {
    await setupThought('Hello World')

    // bold "World"
    selectRange('Hello '.length, 'Hello World'.length)
    await dispatch(formatSelection('bold'))
    expect(cursorValue()).toBe('Hello <b>World</b>')

    // select "orl" (a sub-range within the bold "World") and bold again → that sub-range should toggle off
    selectPlainRange('Hello W'.length, 'Hello Worl'.length)
    await dispatch(formatSelection('bold'))
    expect(cursorValue()).toBe('Hello <b>W</b>orl<b>d</b>')
  })

  it('bolds a whole thought whose leading text is italic, wrapping the outer tag', async () => {
    await setupThought('<i>Hello</i> World')

    selectPlainRange(0, 'Hello World'.length)
    await dispatch(formatSelection('bold'))
    expect(cursorValue()).toBe('<b><i>Hello</i> World</b>')
  })

  it('removes formatting from the whole thought', async () => {
    await setupThought('goodbye')

    await dispatch(formatSelection('bold'))
    expect(cursorValue()).toBe('<b>goodbye</b>')

    await dispatch(formatSelection('removeFormat'))
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

    await dispatch(formatSelection('foreColor', 'blue'))

    expect(cursorValue()).toBe('<font color="#00c7e6">Golden Retriever</font>')
  })

  // color.ts > "Bullet remains the default color when a substring color is set" (value portion)
  it('sets the text color of a substring only', async () => {
    await setupThought('Golden Retriever')

    selectRange(0, 'Golden'.length)
    await dispatch(formatSelection('foreColor', 'blue'))

    expect(cursorValue()).toBe('<font color="#00c7e6">Golden</font> Retriever')
  })

  // coloring a substring whose boundary aligns with an existing formatting wrapper must not leave an empty tag behind
  it('does not leave an empty formatting tag when coloring an existing bold substring', async () => {
    await setupThought('X<b>ab</b>Y')

    // color exactly the bold "ab"
    selectPlainRange(1, 3)
    await dispatch(formatSelection('foreColor', 'blue'))

    expect(cursorValue()).toBe('X<font color="#00c7e6"><b>ab</b></font>Y')
  })

  // color.ts > "remove all formatting from the thought"
  it('removes all formatting from the thought', async () => {
    await setupThought('Labrador')

    for (const command of ['bold', 'italic', 'underline', 'strikethrough'] as const) {
      await dispatch(formatSelection(command))
    }

    await dispatch(formatSelection('foreColor', 'blue'))

    await dispatch(formatSelection('removeFormat'))

    expect(cursorValue()).toBe('Labrador')
  })

  // color.ts > "Set the background color of the text"
  it('sets the background color of the whole thought', async () => {
    await setupThought('Golden Retriever')

    await dispatch(formatSelection('backColor', 'green'))

    expect(cursorValue()).toBe(
      '<font color="#000000" style="background-color: rgb(0, 214, 136);">Golden Retriever</font>',
    )
  })

  // color.ts > "Clear the background color when selecting text color"
  it('clears the background color when selecting a text color', async () => {
    await setupThought('Golden Retriever')

    await dispatch(formatSelection('backColor', 'green'))

    await dispatch(formatSelection('foreColor', 'purple'))

    expect(cursorValue()).toBe('<font color="#aa80ff">Golden Retriever</font>')
  })

  // color.ts > "Clear the text color when setting background color"
  it('clears the text color when setting a background color', async () => {
    await setupThought('Golden Retriever')

    await dispatch(formatSelection('foreColor', 'green'))

    await dispatch(formatSelection('backColor', 'purple'))

    expect(cursorValue()).toBe(
      '<font color="#000000" style="background-color: rgb(170, 128, 255);">Golden Retriever</font>',
    )
  })

  // color.ts > "Empty <font> element will be removed after setting color to default."
  it('removes the font element when setting color to default', async () => {
    await setupThought('Golden Retriever')

    await dispatch(formatSelection('foreColor', 'blue'))

    await dispatch(formatSelection('foreColor', 'fg'))

    expect(cursorValue()).toBe('Golden Retriever')
  })

  // color.ts > "Can change the color of a thought that already has the same color applied to part of its text"
  it('changes the color of a thought that already has the color on part of its text', async () => {
    await setupThought('some <font color="#ff573d">formatted</font> text')

    await dispatch(formatSelection('foreColor', 'red'))

    expect(cursorValue()).toBe('<font color="#ff573d">some formatted text</font>')
  })

  // color.ts > "Can change the background color of a thought that already has the same background color applied to part of its text"
  it('changes the background color of a thought that already has the background on part of its text', async () => {
    await setupThought('some <font color="#000000" style="background-color: rgb(255, 87, 61);">formatted</font> text')

    await dispatch(formatSelection('backColor', 'red'))

    expect(cursorValue()).toBe(
      '<font color="#000000" style="background-color: rgb(255, 87, 61);">some formatted text</font>',
    )
  })

  // undo.ts > "Should revert background color changes back to previous values" (the two-green markup that undo restores)
  it('applies a background color to two separate words as consolidated font tags', async () => {
    await setupThought('Lorem Ipsum Dolor Sit Amet')

    // green background on the first word "Lorem"
    selectPlainRange(0, 'Lorem'.length)
    await dispatch(formatSelection('backColor', 'green'))

    // green background on the last word "Amet"
    selectPlainRange('Lorem Ipsum Dolor Sit '.length, 'Lorem Ipsum Dolor Sit Amet'.length)
    await dispatch(formatSelection('backColor', 'green'))

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
    await dispatch(formatSelection('backColor', 'green'))

    // red background on "One two"
    selectPlainRange(0, 'One two'.length)
    await dispatch(formatSelection('backColor', 'red'))

    // "One two" is red; " three" remains green
    expect(cursorValue()).toBe(
      '<font color="#000000" style="background-color: rgb(255, 87, 61);">One two</font><font color="#000000" style="background-color: rgb(0, 214, 136);"> three</font>',
    )
  })

  // a background color applied over a bold thought must keep both the <b> and the color <font>
  it('preserves bold when applying a background color to the whole thought', async () => {
    await setupThought('One')

    // bold the whole thought
    await dispatch(formatSelection('bold'))
    expect(cursorValue()).toBe('<b>One</b>')

    // apply a background color to the whole thought
    await dispatch(formatSelection('backColor', 'green'))

    const value = cursorValue()
    expect(value).toContain('<b>')
    expect(value).toContain('background-color: rgb(0, 214, 136)')
    expect(value).toBe('<font color="#000000" style="background-color: rgb(0, 214, 136);"><b>One</b></font>')
  })

  // #4265: applying a text color to a numeric thought that has a background color clears the background
  it('clears the background color of a numeric thought when applying a text color (#4265)', async () => {
    await setupThought('123')

    await dispatch(formatSelection('backColor', 'green'))

    await dispatch(formatSelection('foreColor', 'blue'))

    expect(cursorValue()).toBe('<font color="#00c7e6">123</font>')
  })

  // #3877: an empty thought (e.g. one produced by splitting) should not accept a text/background color.
  it('does not apply a color to an empty thought (#3877)', async () => {
    await dispatch(newThought({ value: '' }))

    await dispatch(formatSelection('backColor', 'green'))

    expect(cursorValue()).toBe('')
  })

  // #3901: applying the default background color to a thought that has no custom background is a no-op.
  it('does not add markup when applying the default background to a thought with no background (#3901)', async () => {
    await setupThought('Hello')

    selectPlainRange(0, 'Hello'.length)
    await dispatch(formatSelection('backColor', 'bg'))

    expect(cursorValue()).toBe('Hello')
  })
})

describe('formatSelection note', () => {
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  // #4009 / color.ts > "Toggle the background color of the note" (intermediate): a note can be given a background color
  it('applies a background color to a note', async () => {
    await setupNote('Note')

    await dispatch(formatSelection('backColor', 'green'))

    expect(noteVal()).toBe('<font color="#000000" style="background-color: rgb(0, 214, 136);">Note</font>')
  })

  // #3901 / color.ts > "Toggling note background color on and off should remove formatting tag"
  it('removes the background color from a note when toggled off', async () => {
    await setupNote('Note')

    await dispatch(formatSelection('backColor', 'green'))
    expect(noteVal()).toBe('<font color="#000000" style="background-color: rgb(0, 214, 136);">Note</font>')

    // deselecting a background applies the default note foreground, which clears the background
    await dispatch(formatSelection('foreColor', 'fgNote'))
    expect(noteVal()).toBe('Note')
  })

  // #3901: setting a foreground color on a note that has a background color removes the background
  it('setting a note foreground color removes its background color', async () => {
    await setupNote('Note')

    await dispatch(formatSelection('backColor', 'green'))

    await dispatch(formatSelection('foreColor', 'yellow'))

    expect(noteVal()).toBe('<font color="#ffd014">Note</font>')
  })

  // #4657: a note can be explicitly set to white (the thought default color). White (fg, opaque) must not be treated as
  // the note's own default (fgNote, 50%-alpha white), which would clear it — the two differ only in opacity.
  it('sets a note foreground color to white', async () => {
    await setupNote('Note')

    await dispatch(formatSelection('foreColor', 'fg'))

    expect(noteVal()).toBe('<font color="#ffffff">Note</font>')
  })
})
