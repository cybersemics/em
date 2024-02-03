import classNames from 'classnames'

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
  <span className={center ? 'absolute-center' : undefined}>
    <span
      className={classNames({ 'loading-ellipsis': true, 'text-note': center })}
      style={
        delay
          ? {
              animation: `0.4s ease-out ${delay ?? 0}ms normal forwards fadein`,
              // set opacity to 0 during the animation-delay
              opacity: 0,
            }
          : undefined
      }
    >
      {text}
    </span>
  </span>
)

export default LoadingEllipsis
