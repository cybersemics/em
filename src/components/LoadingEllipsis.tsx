import classNames from 'classnames'

/** Renders text with an animated '...'. */
const LoadingEllipsis = ({
  center,
  text = 'Loading',
}: {
  /** Absolutely centered. */
  center?: boolean
  text?: string
}) => (
  <span className={center ? 'absolute-center' : undefined}>
    <span className={classNames({ 'loading-ellipsis': true, 'text-note': center })}>{text}</span>
  </span>
)

export default LoadingEllipsis
