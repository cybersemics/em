/** The phase of a watched tap. */
type Phase =
  /** Waiting for iOS's first move after the touchend. */
  | 'awaiting'
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
    // to come and ends the watch here. Once placed or reverted, it changes nothing.
    return {
      watch: phase !== 'awaiting' ? watch : canRevert ? { ...watch, phase: 'placed' } : null,
      effect: null,
    }
  }

  if (phase === 'awaiting' && ((edge === 'start' && current === 0) || (edge === 'end' && current === length))) {
    // The jump of a tap at the edge (#6178) is put back without changing the phase, since iOS's placement or move back
    // is still to come. On the devices that deliver the put-back's own selectionchange, that is then taken for the
    // placement. It makes no difference to what iOS does after a jump, which is to move the caret back, sometimes after
    // a move to the tapped offset. If iOS ever placed the caret at the other end of the word after a jump, the watch
    // would leave that move alone, and its move back would return the caret to getCaretOffset's choice.
    return { watch, effect: 'putBack' }
  }

  if (canRevert && phase !== 'reverted' && current === before) {
    // iOS moving the caret back to where it was before the tap (#4220), after the placement or, for a tap at the edge,
    // straight after the jump. It comes only once, so the watch then only waits for a move that ends it.
    return { watch: { ...watch, phase: 'reverted' }, effect: 'putBack' }
  }

  if (phase === 'awaiting' && canRevert) {
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
