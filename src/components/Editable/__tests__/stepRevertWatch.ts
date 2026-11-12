import stepRevertWatch, { RevertWatch } from '../stepRevertWatch'

// Offsets in "Hello beautiful people in the world".
const length = 'Hello beautiful people in the world'.length
const offsetAfterHello = 'Hello'.length
const offsetBeforeIn = 'Hello beautiful people '.length
const offsetBeforeThe = 'Hello beautiful people in '.length
const offsetAfterThe = 'Hello beautiful people in the'.length

/** A tap on the given offset, with the caret at before, as onTouchEnd starts watching it. */
const tap = (offset: number, before: number, edge: RevertWatch['edge'] = null): RevertWatch => ({
  offset,
  before,
  edge,
  phase: 'awaiting',
})

// https://github.com/cybersemics/em/issues/4220
it('puts back the move back to where the caret was before the tap', () => {
  const placed = stepRevertWatch(tap(offsetBeforeIn, offsetBeforeThe), { current: offsetBeforeIn, length })
  expect(placed).toEqual({ watch: { ...tap(offsetBeforeIn, offsetBeforeThe), phase: 'placed' }, effect: null })

  const reverted = stepRevertWatch(placed.watch!, { current: offsetBeforeThe, length })
  expect(reverted).toEqual({ watch: { ...placed.watch!, phase: 'reverted' }, effect: 'putBack' })

  // the put-back's own selectionchange changes nothing
  expect(stepRevertWatch(reverted.watch!, { current: offsetBeforeIn, length })).toEqual({
    watch: reverted.watch,
    effect: null,
  })
})

it('ends the watch on a move after the move back, such as the space bar scrub', () => {
  const reverted: RevertWatch = { ...tap(offsetBeforeIn, offsetBeforeThe), phase: 'reverted' }
  expect(stepRevertWatch(reverted, { current: offsetBeforeIn - 1, length })).toEqual({ watch: null, effect: null })
})

it('leaves alone the offsets iOS passes through on its way back', () => {
  const placed: RevertWatch = { ...tap(offsetBeforeIn, offsetBeforeThe), phase: 'placed' }
  expect(stepRevertWatch(placed, { current: offsetBeforeIn + 2, length })).toEqual({ watch: placed, effect: null })
  expect(stepRevertWatch(placed, { current: offsetBeforeThe, length })).toEqual({
    watch: { ...placed, phase: 'reverted' },
    effect: 'putBack',
  })
})

it('records the other end of the tapped word when iOS places the caret there, and puts the move back to it', () => {
  const placed = stepRevertWatch(tap(offsetBeforeThe, offsetBeforeIn), { current: offsetAfterThe, length })
  expect(placed).toEqual({
    watch: { ...tap(offsetBeforeThe, offsetBeforeIn), offset: offsetAfterThe, phase: 'placed' },
    effect: 'record',
  })

  expect(stepRevertWatch(placed.watch!, { current: offsetBeforeIn, length })).toEqual({
    watch: { ...placed.watch!, phase: 'reverted' },
    effect: 'putBack',
  })
})

// https://github.com/cybersemics/em/issues/6178
it('puts back the jump of a tap above the line, and the move back after it', () => {
  const jumped = stepRevertWatch(tap(offsetAfterHello, offsetBeforeThe, 'start'), { current: 0, length })
  expect(jumped).toEqual({
    watch: { ...tap(offsetAfterHello, offsetBeforeThe, 'start'), phase: 'jumped' },
    effect: 'putBack',
  })

  expect(stepRevertWatch(jumped.watch!, { current: offsetBeforeThe, length })).toEqual({
    watch: { ...jumped.watch!, phase: 'reverted' },
    effect: 'putBack',
  })
})

it('does not take the put-back of a jump for the placement, so iOS placing the caret after it is still recorded', () => {
  const jumped = stepRevertWatch(tap(offsetBeforeThe, offsetBeforeIn, 'end'), { current: length, length })
  expect(jumped.effect).toBe('putBack')

  // the put-back's own selectionchange, which a device may or may not deliver
  expect(stepRevertWatch(jumped.watch!, { current: offsetBeforeThe, length })).toEqual({
    watch: jumped.watch,
    effect: null,
  })

  expect(stepRevertWatch(jumped.watch!, { current: offsetAfterThe, length })).toEqual({
    watch: { ...jumped.watch!, offset: offsetAfterThe, phase: 'placed' },
    effect: 'record',
  })
})

it('takes a jump to the start for the placement when the tap was not at the top edge', () => {
  expect(stepRevertWatch(tap(offsetBeforeThe, offsetBeforeIn, 'end'), { current: 0, length })).toEqual({
    watch: { ...tap(offsetBeforeThe, offsetBeforeIn, 'end'), offset: 0, phase: 'placed' },
    effect: 'record',
  })
})

it('ends the watch of a tap on the caret on its first move, since there is no move back to come', () => {
  expect(stepRevertWatch(tap(offsetBeforeIn, offsetBeforeIn), { current: offsetBeforeIn, length })).toEqual({
    watch: null,
    effect: null,
  })
  expect(stepRevertWatch(tap(offsetBeforeIn, offsetBeforeIn), { current: offsetBeforeIn - 1, length })).toEqual({
    watch: null,
    effect: null,
  })
})
