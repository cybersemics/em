import { CSSProperties } from 'react'
import { css, cx } from '../../styled-system/css'

interface LoaderProps {
  size?: number
  style?: CSSProperties
  className?: string
}

const rippleLoaderChild = {
  position: 'absolute',
  borderWidth: '19.04%',
  borderStyle: 'solid',
  opacity: 1,
  borderRadius: '50%',
  animation: 'ripple_loader 1s cubic-bezier(0, 0.2, 0.8, 1) infinite',
  boxSizing: 'content-box',
}

/**
 * Loading component.
 */
const Loader = ({ size = 32, style, className }: LoaderProps) => {
  return (
    <div
      className={cx(css({ display: 'inline-block', overflow: 'hidden', background: 'fgTransparent' }), className)}
      style={{ ...style, height: size, width: size }}
    >
      <div
        className={css({
          width: '100%',
          height: '100%',
          position: 'relative',
          transform: 'translateZ(0) scale(0.49)',
          backfaceVisibility: 'hidden',
          transformOrigin: '0 0',
        })}
      >
        <div className={css(rippleLoaderChild, { borderColor: 'pinkAgainstFg', animationDelay: '0s' })}></div>
        <div className={css(rippleLoaderChild, { borderColor: 'brightBlue', animationDelay: '-0.5s' })}></div>
      </div>
    </div>
  )
}
export default Loader
