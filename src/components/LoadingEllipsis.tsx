import { css, cx } from '../../styled-system/css'
import { textNoteRecipe } from '../../styled-system/recipes'

/** Renders text with an animated '...'. */
const LoadingEllipsis = ({
  center,
  delay,
  text = 'Loading',
}: {
  /** Absolutely centered. */
  center?: boolean
  /** Delay and then fade in after the given number of ms. */
  delay?: number
  text?: string
}) => (
  <span
    data-loading-indicator
    className={
      center
        ? css({
            position: 'absolute',
            top: '0',
            right: '0',
            bottom: '10%',
            left: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            userSelect: 'none',
            cursor: 'default',
          })
        : undefined
    }
  >
    <span
      className={cx(
        css({
          '&::after': {
            overflow: 'hidden',
            position: 'absolute',
            display: 'inline-block',
            verticalAlign: 'bottom',
            animation: 'ellipsis steps(4, end) 1000ms infinite',
            content: "'\\2026'",
            width: '0',
            marginLeft: '0.1em',
          },
          ...(delay
            ? {
                animation: `0.4s ease-out ${delay ?? 0}ms normal forwards fadein`,
                // set opacity to 0 during the animation-delay
                opacity: 0,
              }
            : undefined),
        }),
        center && textNoteRecipe(),
      )}
    >
      {text}
    </span>
  </span>
)

export default LoadingEllipsis
