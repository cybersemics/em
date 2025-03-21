import { css } from '../../styled-system/css'
import FauxCaretType from '../@types/FauxCaretType'
import { isSafari, isTouch } from '../browser'

/** Take a FauxCaretType and return a CSS var that controls that type. */
const getFauxCaretCssVar = (caretType: FauxCaretType) => {
  switch (caretType) {
    case 'thoughtStart':
      return 'var(--faux-caret-line-start-opacity)'
    case 'thoughtEnd':
      return 'var(--faux-caret-line-end-opacity)'
    case 'noteStart':
      return 'var(--faux-caret-note-line-start-opacity)'
    case 'noteEnd':
      return 'var(--faux-caret-note-line-end-opacity)'
    case 'positioned':
      return 'var(--faux-caret-opacity)'
  }
}

/**
 * Faux caret to display during hideCaret animations on mobile Safari.
 *
 * Combined with the hideCaret animations, this replaces the actual caret with a
 * simulated caret in order to side-step issues mobile Safari has with positioning
 * said caret during animated transforms.
 *
 * There is a faux caret in each TreeNode that moves with the position of the real caret
 * according to the bounding rect fetched from `window.getSelection()` (see
 * `getBoundingClientRect` in selection.ts for implementation details).
 *
 * Additionally, there are line start and end faux carets defined in ThoughtAnnotation.tsx and
 * Note.tsx to cover cases where the client rect is not available because the selection is
 * not a text node (see `isStartOfElementNode` in selection.ts for implementation details).
 */
const FauxCaret = ({ caretType }: { caretType: FauxCaretType }) => {
  if (!isTouch || !isSafari()) return null
  return (
    <span
      className={css({
        color: 'caret',
        pointerEvents: 'none',
        WebkitTextStroke: '1px {colors.caret}',
      })}
      // opacity cannot be determined statically for PandaCSS, so it must be applied as an inline style
      style={{ opacity: getFauxCaretCssVar(caretType) }}
    >
      |
    </span>
  )
}

export default FauxCaret
