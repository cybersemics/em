import { act } from 'react'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { resetLastCommand } from '../../commands'
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

  // Apply Color disallows multiple thoughts, so a single selected thought takes the multicursor path that resolves repeat before delegating to executeCommand.
  act(() => {
    store.dispatch(addMulticursor(['Labrador']))
  })
  await act(vi.runOnlyPendingTimersAsync)

  await keyDown('.', { meta: true })

  expect(cursorValue()).toBe('<font color="#00c7e6">Labrador</font>')
})
