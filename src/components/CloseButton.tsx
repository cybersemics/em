import { PropsWithChildren } from 'react'
import { useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { upperRightRecipe } from '../../styled-system/recipes'
import { SystemStyleObject } from '../../styled-system/types'
import fastClick from '../util/fastClick'

type CloseButtonProps = {
  onClose: () => void
  disableSwipeToDismiss?: boolean
  cssRaw?: SystemStyleObject
  style?: React.CSSProperties
}

/** Base for a close button. */
const BaseCloseButton = ({
  onClose,
  disableSwipeToDismiss,
  cssRaw,
  style,
  children,
}: PropsWithChildren<CloseButtonProps>) => {
  return (
    <a
      {...fastClick(onClose)}
      className={cx(
        upperRightRecipe(),
        css(
          {
            // inherit not yet supported by plugin
            // eslint-disable-next-line @pandacss/no-hardcoded-color
            color: 'inherit',
            textDecoration: 'none',
          },
          cssRaw,
        ),
      )}
      style={style}
      aria-label={disableSwipeToDismiss ? 'no-swipe-to-dismiss' : undefined}
      data-testid='close-button'
      data-close-button
    >
      {children}
    </a>
  )
}

/** A circled close button with an ✕. Sized using parent fontsize. */
const CircledCloseButton = ({ cssRaw, ...props }: CloseButtonProps) => {
  return (
    <BaseCloseButton
      {...props}
      cssRaw={css.raw(
        {
          display: 'flex',
          // inherit not yet supported by plugin
          // eslint-disable-next-line @pandacss/no-hardcoded-color
          color: 'inherit',
          textDecoration: 'none',
          borderRadius: '50%',
          transform: 'translate(50%, -50%)',
          // inherit not yet supported by plugin
          // eslint-disable-next-line @pandacss/no-hardcoded-color
          background: 'inherit',
          border: 'inherit',
        },
        cssRaw,
      )}
    >
      <svg width='1em' height='1em' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
          d='M4.49642 12.1284L8.06394 8.56023L11.5039 12.0166L12.0802 11.4566L8.62388 8.00023L12.0802 4.54391L11.5039 3.98391L8.06394 7.44023L4.49642 3.87207L3.92017 4.43207L7.48833 8.00023L3.92017 11.5684L4.49642 12.1284Z'
          fill='white'
        />
      </svg>
    </BaseCloseButton>
  )
}

/** A close button with an ✕. */
const LetterCloseButton = (props: CloseButtonProps) => {
  const fontSize = useSelector(state => state.fontSize)
  const padding = fontSize / 2 + 2
  return (
    <BaseCloseButton {...props} style={{ fontSize, padding: `${padding}px ${padding * 1.25}px` }}>
      ✕
    </BaseCloseButton>
  )
}

/** A close button with an ✕. */
const CloseButton = ({ circled, ...props }: CloseButtonProps & { circled?: boolean }) => {
  return circled ? <CircledCloseButton {...props} /> : <LetterCloseButton {...props} />
}

export default CloseButton
