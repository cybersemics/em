import { useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { upperRight } from '../../styled-system/recipes'
import fastClick from '../util/fastClick'

/** A close button with an ✕. */
const CloseButton = ({ onClose, disableSwipeToDismiss }: { onClose: () => void; disableSwipeToDismiss?: boolean }) => {
  const fontSize = useSelector(state => state.fontSize)
  return (
    <a
      {...fastClick(onClose)}
      className={cx(
        upperRight(),
        css({
          fontSize: 'sm',
          color: 'inherit',
          right: '10',
          textDecoration: 'none',
          top: '5',
        }),
      )}
      style={{ fontSize }}
      aria-label={disableSwipeToDismiss ? 'no-swipe-to-dismiss' : undefined}
      data-testid='close-button'
    >
      ✕
    </a>
  )
}

export default CloseButton
