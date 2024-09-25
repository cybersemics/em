import { useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { upperRight } from '../../styled-system/recipes'
import fastClick from '../util/fastClick'

/** A close button with an ✕. */
const CloseButton = ({ onClose, disableSwipeToDismiss }: { onClose: () => void; disableSwipeToDismiss?: boolean }) => {
  const fontSize = useSelector(state => state.fontSize)
  const padding = fontSize / 2 + 2
  return (
    <a
      {...fastClick(onClose)}
      className={cx(
        upperRight(),
        css({
          fontSize: 'sm',
          color: 'inherit',
          right: '0',
          textDecoration: 'none',
          top: '0',
        }),
      )}
      style={{ fontSize, padding: `${padding}px ${padding * 1.25}px` }}
      aria-label={disableSwipeToDismiss ? 'no-swipe-to-dismiss' : undefined}
      data-testid='close-button'
    >
      ✕
    </a>
  )
}

export default CloseButton
