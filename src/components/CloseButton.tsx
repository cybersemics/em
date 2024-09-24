import classNames from 'classnames'
import { useSelector } from 'react-redux'
import fastClick from '../util/fastClick'

/** A close button with an ✕. */
const CloseButton = ({ onClose, disableSwipeToDismiss }: { onClose: () => void; disableSwipeToDismiss?: boolean }) => {
  const fontSize = useSelector(state => state.fontSize)
  const padding = fontSize / 2 + 2
  return (
    <a
      {...fastClick(onClose)}
      className={classNames({
        'upper-right': true,
        'text-small': true,
        'no-swipe-to-dismiss': disableSwipeToDismiss,
      })}
      data-testid='close-button'
      style={{
        color: 'inherit',
        fontSize,
        padding: `${padding}px ${padding * 1.25}px`,
        right: '0',
        textDecoration: 'none',
        top: '0',
      }}
    >
      ✕
    </a>
  )
}

export default CloseButton
