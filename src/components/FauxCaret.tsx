import { CSSProperties } from 'react'
import { css } from '../../styled-system/css'
import { isSafari, isTouch } from '../browser'

/**
 * Faux caret to display during hideCaret animations on mobile Safari.
 */
const FauxCaret = ({ styles }: { styles: CSSProperties }) => {
  if (!isTouch || !isSafari()) return null
  return (
    <span
      className={css({
        color: 'caret',
        fontSize: '1.25em',
        position: 'absolute',
        pointerEvents: 'none',
        WebkitTextStroke: '1px var(--colors-caret)',
      })}
      // Using a CSS variable to control opacity does not appear to work inside Panda's CSS generator
      style={styles}
    >
      |
    </span>
  )
}

export default FauxCaret
