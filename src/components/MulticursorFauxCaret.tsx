import { css } from '../../styled-system/css'
import caretRectStore from '../stores/caretRectStore'
import FauxCaret from './FauxCaret'

/**
 * Overlays a faux caret on a thought that is being edited as part of a multiselection but does not hold the real caret.
 *
 * Only one thought can hold the browser caret, so the other thoughts of the multiselection render this to show that
 * they are being edited too (see Clear Thought). It is positioned at the real caret's own offsets within the thought
 * that holds it, from `caretRectStore`, so it matches the real caret's x, y, line, and height exactly, including within
 * formatted text and on a wrapped line. The offsets are applied relative to the editable it overlays, of which it is an
 * absolutely positioned sibling.
 *
 * Mirroring the real caret's geometry rather than laying out the overlaid thought's own value is what keeps the two in
 * sync when the values differ: the thoughts render as empty placeholders while they are cleared, and the value that is
 * mirrored to them is trimmed, so a trailing space that the real caret sits after is not rendered beneath the faux one.
 */
const MulticursorFauxCaret = ({ editableRef }: { editableRef: React.RefObject<HTMLElement | null> }) => {
  const { x, y, height } = caretRectStore.useState()
  const editable = editableRef.current

  return x === null || !editable ? null : (
    <span
      aria-hidden
      data-testid='faux-caret-multicursor'
      className={css({ position: 'absolute', pointerEvents: 'none', userSelect: 'none' })}
      // the caret's position and height are runtime values, so they cannot be applied with PandaCSS
      style={{ left: editable.offsetLeft + x, top: editable.offsetTop + (y ?? 0), fontSize: height ?? undefined }}
    >
      <FauxCaret caretType='multicursorStart' />
    </span>
  )
}

export default MulticursorFauxCaret
