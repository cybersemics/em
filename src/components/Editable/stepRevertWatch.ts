/** The phase of a watched tap. */
type Phase =
  /** Waiting for iOS's first move after the touchend. */
  | 'awaiting'
  /**
   * The jump of a tap at the edge has been put back, and iOS's placement or move back is still to come. Unlike
   * awaiting, a move to the tapped offset does not count as the placement, since it may be the put-back's own
   * selectionchange, which arrives as a separate event on some devices and not on others.
   */
  | 'jumped'
  /** The caret has been placed at the tapped word, and iOS may yet move it back. */
  | 'placed'
  /** The move back has been put right, and iOS does not move the caret again. */
  | 'reverted'

/** A tap being watched by useRevertCorrection. */
export type RevertWatch = {
  /** The offset to keep the caret at. */
  offset: number
  /** Where the caret was before the tap. */
  before: number
  /** The edge of the thought's text the tap was at, if any. */
  edge: 'start' | 'end' | null
  /** How far iOS has got with the tap. */
  phase: Phase
}

/** What useRevertCorrection does about a move: put the caret back at the watch's offset, or record that offset. */
type Effect = 'putBack' | 'record' | null

/**
 * Takes a watched tap one move of the collapsed caret further. Returns the watch after the move, null if the move ends
 * it, and what the hook should do about the move.
 */
const stepRevertWatch = (
  watch: RevertWatch,
  {
    current,
    length,
  }: {
    /** The caret's offset after the move. */
    current: number
    /** The length of the thought's text, which is where the jump of a tap below the last line lands. */
    length: number
  },
): { watch: RevertWatch | null; effect: Effect } => {
  const { offset, before, edge, phase } = watch
  // A tap on the caret leaves nothing for iOS to move back.
  const canRevert = offset !== before

  if (current === offset) {
    // The put-back's own selectionchange, or iOS placing the caret where getCaretOffset did. While awaiting, this is
    // iOS's placement, and the move back is what comes next, except after a tap on the caret, which has no move back
    // to come and ends the watch here. In any other phase, it changes nothing.
    return {
      watch: phase !== 'awaiting' ? watch : canRevert ? { ...watch, phase: 'placed' } : null,
      effect: null,
    }
  }

  // Neither the placement nor the move back has come yet.
  const unplaced = phase === 'awaiting' || phase === 'jumped'

  if (unplaced && ((edge === 'start' && current === 0) || (edge === 'end' && current === length))) {
    // the jump of a tap at the edge, after which iOS still places the caret or moves it back
    return { watch: { ...watch, phase: 'jumped' }, effect: 'putBack' }
  }

  if (canRevert && phase !== 'reverted' && current === before) {
    // iOS moving the caret back to where it was before the tap (#4220), after the placement or, for a tap at the edge,
    // straight after the jump. It comes only once, so the watch then only waits for a move that ends it.
    return { watch: { ...watch, phase: 'reverted' }, effect: 'putBack' }
  }

  if (unplaced && canRevert) {
    // iOS placing the caret at the other end of the tapped word from getCaretOffset's choice. iOS's placement is where
    // the tap lands, so it replaces getCaretOffset's offset, both as the offset a put-back restores and in Redux.
    return { watch: { ...watch, offset: current, phase: 'placed' }, effect: 'record' }
  }

  // Once placed, iOS is on its way back, passing through other offsets that are left alone. In any other phase,
  // something else is moving the caret, such as the space bar scrub, which may yet reach a place the watch would
  // otherwise put back. A tap on the caret ends here on its first move, since there is no move back to wait for.
  return { watch: phase === 'placed' ? watch : null, effect: null }
}

export default stepRevertWatch
