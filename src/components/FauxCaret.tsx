import { css } from '../../styled-system/css'
import { Property } from '../../styled-system/types/csstype'
import { isSafari, isTouch } from '../browser'

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
const FauxCaret = ({ fontSize, opacity = '0' }: { fontSize?: Property.FontSize; opacity: Property.Opacity }) => {
  if (!isTouch || !isSafari()) return null
  return (
    <span
      className={css({
        color: 'caret',
        fontSize,
        pointerEvents: 'none',
        WebkitTextStroke: '1px var(--colors-caret)',
      })}
      // opacity cannot be determined statically for PandaCSS, so it must be applied as an inline style
      style={{ opacity }}
    >
      |
    </span>
  )
}

export default FauxCaret
