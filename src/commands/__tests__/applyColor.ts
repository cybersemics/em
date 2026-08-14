import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { undoActionCreator as undo } from '../../actions/undo'
import { resetLastCommand } from '../../commands'
import { EMPTY_SPACE, HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import head from '../../util/head'

beforeEach(async () => {
  await createTestApp()
  resetLastCommand()
})
afterEach(cleanupTestApp)

/** Presses a keyboard shortcut on the window, where the global keyDown handler picks it up and executes the matching command. */
const keyDown = async (key: string, { alt, meta }: { alt?: boolean; meta?: boolean } = {}) => {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, altKey: alt, metaKey: meta, bubbles: true }))
  })
  await act(vi.runOnlyPendingTimersAsync)
}

/** Returns the value of the cursor thought. */
const cursorValue = (): string => {
  const state = store.getState()
  return getThoughtById(state, head(state.cursor!))!.value
}

it('applies the text color of the pressed shortcut', async () => {
  act(() => {
    store.dispatch(newThought({ value: 'Golden Retriever' }))
  })
  await act(vi.runOnlyPendingTimersAsync)

  // Command + Option + 5 is the sixth swatch, blue
  await keyDown('5', { meta: true, alt: true })

  expect(cursorValue()).toBe('<font color="#00c7e6">Golden Retriever</font>')
})

it('applies the background color of the pressed shortcut', async () => {
  act(() => {
    store.dispatch(newThought({ value: 'Golden Retriever' }))
  })
  await act(vi.runOnlyPendingTimersAsync)

  // Option + 4 is the fifth swatch of the background color row, green
  await keyDown('4', { alt: true })

  expect(cursorValue()).toBe(
    '<font color="#000000" style="background-color: rgb(0, 214, 136);">Golden Retriever</font>',
  )
})

it('repeat applies the same color as the shortcut that was pressed', async () => {
  act(() => {
    store.dispatch([newThought({ value: 'Golden Retriever' }), newThought({ value: 'Labrador' })])
  })
  await act(vi.runOnlyPendingTimersAsync)

  act(() => {
    store.dispatch(setCursor(['Golden Retriever']))
  })
  await act(vi.runOnlyPendingTimersAsync)

  await keyDown('5', { meta: true, alt: true })

  act(() => {
    store.dispatch(setCursor(['Labrador']))
  })
  await act(vi.runOnlyPendingTimersAsync)

  // Command + . repeats Apply Color with the same swatch
  await keyDown('.', { meta: true })

  expect(cursorValue()).toBe('<font color="#00c7e6">Labrador</font>')
})

it('repeat applies the same color to a single selected thought', async () => {
  act(() => {
    store.dispatch([newThought({ value: 'Golden Retriever' }), newThought({ value: 'Labrador' })])
  })
  await act(vi.runOnlyPendingTimersAsync)

  act(() => {
    store.dispatch(setCursor(['Golden Retriever']))
  })
  await act(vi.runOnlyPendingTimersAsync)

  await keyDown('5', { meta: true, alt: true })

  // Select the cursor thought, as opening the Command Center does. Apply Color declares multicursor: false, so the
  // selection takes the multicursor path that resolves repeat and forwards its recorded keyboardIndex before
  // short-circuiting to executeCommand.
  act(() => {
    store.dispatch([setCursor(['Labrador']), addMulticursor(['Labrador'])])
  })
  await act(vi.runOnlyPendingTimersAsync)

  await keyDown('.', { meta: true })

  // formatSelectionColor applies the color to the selected thought via formatSelection's multicursor branch.
  expect(cursorValue()).toBe('<font color="#00c7e6">Labrador</font>')
})

describe('multicursor', () => {
  it('applies the text color of the pressed shortcut to every selected thought', async () => {
    act(() => {
      store.dispatch([
        importText({
          text: `
            - a
            - b
            - c
          `,
        }),
        setCursor(['a']),
        addMulticursor(['a']),
        addMulticursor(['b']),
        addMulticursor(['c']),
      ])
    })
    await act(vi.runOnlyPendingTimersAsync)

    // Command + Option + 5 is the sixth swatch, blue
    await keyDown('5', { meta: true, alt: true })

    // The exact match on the whole tree also proves the color is applied exactly once per thought: a repeated
    // application would either toggle the color back off or nest additional font tags.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/html')).toBe(`<ul>
  <li>${HOME_TOKEN}${EMPTY_SPACE}
    <ul>
      <li><font color="#00c7e6">a</font></li>
      <li><font color="#00c7e6">b</font></li>
      <li><font color="#00c7e6">c</font></li>
    </ul>
  </li>
</ul>`)
  })

  it('applies the background color of the pressed shortcut to every selected thought', async () => {
    act(() => {
      store.dispatch([
        importText({
          text: `
            - a
            - b
            - c
          `,
        }),
        setCursor(['a']),
        addMulticursor(['a']),
        addMulticursor(['b']),
        addMulticursor(['c']),
      ])
    })
    await act(vi.runOnlyPendingTimersAsync)

    // Option + 4 is the fifth swatch of the background color row, green
    await keyDown('4', { alt: true })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/html')).toBe(`<ul>
  <li>${HOME_TOKEN}${EMPTY_SPACE}
    <ul>
      <li><font color="#000000" style="background-color: rgb(0, 214, 136);">a</font></li>
      <li><font color="#000000" style="background-color: rgb(0, 214, 136);">b</font></li>
      <li><font color="#000000" style="background-color: rgb(0, 214, 136);">c</font></li>
    </ul>
  </li>
</ul>`)
  })

  it('applies the color when there is a multiselect but no cursor', async () => {
    act(() => {
      store.dispatch([
        importText({
          text: `
            - a
            - b
          `,
        }),
        setCursor(null),
        addMulticursor(['a']),
        addMulticursor(['b']),
      ])
    })
    await act(vi.runOnlyPendingTimersAsync)

    await keyDown('5', { meta: true, alt: true })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/html')).toBe(`<ul>
  <li>${HOME_TOKEN}${EMPTY_SPACE}
    <ul>
      <li><font color="#00c7e6">a</font></li>
      <li><font color="#00c7e6">b</font></li>
    </ul>
  </li>
</ul>`)
  })

  it('keeps the cursor and the multicursor selection after applying a color', async () => {
    act(() => {
      store.dispatch([
        importText({
          text: `
            - a
            - b
            - c
          `,
        }),
        setCursor(['a']),
        addMulticursor(['a']),
        addMulticursor(['b']),
        addMulticursor(['c']),
      ])
    })
    await act(vi.runOnlyPendingTimersAsync)

    const { cursor: cursorBefore, multicursors: multicursorsBefore } = store.getState()

    await keyDown('5', { meta: true, alt: true })

    const state = store.getState()

    // Precondition: the color was applied, otherwise the unchanged cursor and selection would be vacuous.
    expect(exportContext(state, [HOME_TOKEN], 'text/html')).toContain('<font color="#00c7e6">a</font>')

    // The single formatSelectionColor dispatch edits the selected thoughts in place (thought ids are stable across
    // edits), so the cursor and the multicursor selection are untouched.
    expect(state.cursor).toEqual(cursorBefore)
    expect(state.multicursors).toEqual(multicursorsBefore)
  })

  it('reverts the color of every selected thought on a single undo', async () => {
    act(() => {
      store.dispatch([
        importText({
          text: `
            - a
            - b
            - c
          `,
        }),
        setCursor(['a']),
        addMulticursor(['a']),
        addMulticursor(['b']),
        addMulticursor(['c']),
      ])
    })
    await act(vi.runOnlyPendingTimersAsync)

    await keyDown('5', { meta: true, alt: true })

    // Precondition: every selected thought was colored, otherwise the undo below would have nothing to revert.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/html')).toBe(`<ul>
  <li>${HOME_TOKEN}${EMPTY_SPACE}
    <ul>
      <li><font color="#00c7e6">a</font></li>
      <li><font color="#00c7e6">b</font></li>
      <li><font color="#00c7e6">c</font></li>
    </ul>
  </li>
</ul>`)

    act(() => {
      store.dispatch(undo())
    })
    await act(vi.runOnlyPendingTimersAsync)

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/html')).toBe(`<ul>
  <li>${HOME_TOKEN}${EMPTY_SPACE}
    <ul>
      <li>a</li>
      <li>b</li>
      <li>c</li>
    </ul>
  </li>
</ul>`)
  })
})
