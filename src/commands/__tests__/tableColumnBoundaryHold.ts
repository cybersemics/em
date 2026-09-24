import { keyDown, keyUp } from '../../commands'
import heldKeysStore from '../../stores/heldKeysStore'

/** Builds a minimal synthetic KeyboardEvent with a spyable preventDefault. */
const makeEvent = (key: string, repeat: boolean): KeyboardEvent => {
  const preventDefault = vi.fn()
  return { key, repeat, altKey: false, metaKey: false, ctrlKey: false, preventDefault } as unknown as KeyboardEvent
}

describe('table column boundary hold suppression', () => {
  it('hard-stops auto-repeat of the arrow key that just crossed a column boundary', () => {
    heldKeysStore.update({ arrowKeyBoundaryCross: 'ArrowRight' })

    const event = makeEvent('ArrowRight', true)
    keyDown(event)

    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('does not suppress a discrete (non-repeat) press of the crossing key', () => {
    heldKeysStore.update({ arrowKeyBoundaryCross: 'ArrowRight' })

    const event = makeEvent('ArrowRight', false)
    keyDown(event)

    // a non-repeat press should not be caught by the boundary-cross guard
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('does not suppress auto-repeat of a different key', () => {
    heldKeysStore.update({ arrowKeyBoundaryCross: 'ArrowRight' })

    const event = makeEvent('ArrowDown', true)
    keyDown(event)

    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('clears the flag when the crossing key is released', () => {
    heldKeysStore.update({ arrowKeyBoundaryCross: 'ArrowRight' })

    keyUp(makeEvent('ArrowRight', false))

    expect(heldKeysStore.getState().arrowKeyBoundaryCross).toBeNull()
  })

  it('keeps the flag when a different key is released', () => {
    heldKeysStore.update({ arrowKeyBoundaryCross: 'ArrowRight' })

    keyUp(makeEvent('ArrowLeft', false))

    expect(heldKeysStore.getState().arrowKeyBoundaryCross).toBe('ArrowRight')
  })
})
