import { keyDown, keyUp } from '../../commands'
import globals from '../../globals'

/** Builds a minimal synthetic KeyboardEvent with a spyable preventDefault. */
const makeEvent = (key: string, repeat: boolean): KeyboardEvent => {
  const preventDefault = vi.fn()
  return { key, repeat, altKey: false, metaKey: false, ctrlKey: false, preventDefault } as unknown as KeyboardEvent
}

beforeEach(() => {
  globals.arrowKeyBoundaryCross = null
})

describe('table column boundary hold suppression', () => {
  it('hard-stops auto-repeat of the arrow key that just crossed a column boundary', () => {
    globals.arrowKeyBoundaryCross = 'ArrowRight'

    const event = makeEvent('ArrowRight', true)
    keyDown(event)

    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('does not suppress a discrete (non-repeat) press of the crossing key', () => {
    globals.arrowKeyBoundaryCross = 'ArrowRight'

    const event = makeEvent('ArrowRight', false)
    keyDown(event)

    // a non-repeat press should not be caught by the boundary-cross guard
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('does not suppress auto-repeat of a different key', () => {
    globals.arrowKeyBoundaryCross = 'ArrowRight'

    const event = makeEvent('ArrowDown', true)
    keyDown(event)

    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('clears the flag when the crossing key is released', () => {
    globals.arrowKeyBoundaryCross = 'ArrowRight'

    keyUp(makeEvent('ArrowRight', false))

    expect(globals.arrowKeyBoundaryCross).toBeNull()
  })

  it('keeps the flag when a different key is released', () => {
    globals.arrowKeyBoundaryCross = 'ArrowRight'

    keyUp(makeEvent('ArrowLeft', false))

    expect(globals.arrowKeyBoundaryCross).toBe('ArrowRight')
  })
})
