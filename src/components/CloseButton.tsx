import { useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { upperRightRecipe } from '../../styled-system/recipes'
import fastClick from '../util/fastClick'
import haptics from '../util/haptics'

/** A close button with an ✕. */
const CloseButton = ({ onClose, disableSwipeToDismiss }: { onClose: () => void; disableSwipeToDismiss?: boolean }) => {
  const fontSize = useSelector(state => state.fontSize)
  const padding = fontSize / 2 + 2
  return (
    <a
      {...fastClick(onClose, { tapDown: haptics.medium })}
      className={cx(
        upperRightRecipe(),
        css({
          fontSize: 'sm',
          // inherit not yet supported by plugin
          // eslint-disable-next-line @pandacss/no-hardcoded-color
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
