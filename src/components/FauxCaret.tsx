import { CSSProperties } from 'react'
import { css } from '../../styled-system/css'
import { isMobileSafari } from '../browser'

const FauxCaret = ({ styles }: { styles: CSSProperties }) => {
  if (!isMobileSafari()) return null
  return (
    <span
      className={css({
        color: 'caret',
        fontSize: '1.25em',
        position: 'absolute',
        pointerEvents: 'none',
        WebkitTextStroke: '1px var(--colors-blue)',
      })}
      // Using a CSS variable to control opacity does not appear to work inside Panda's CSS generator
      style={styles}
    >
      |
    </span>
  )
}

export default FauxCaret
