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
          justifyContent: 'center',
          alignItems: 'center',
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
          padding: '0.5em',
        },
        cssRaw,
      )}
    >
      <svg fill='currentColor' width='0.5em' height='0.5em' xmlns='http://www.w3.org/2000/svg' viewBox='1 0.5 7 7'>
        <path d='M1.64877 0.515015C1.48064 0.515015 1.31939 0.58189 1.20064 0.700647C0.953139 0.948151 0.953139 1.3494 1.20064 1.5969L3.60384 4.00058L1.20064 6.40378C0.953139 6.65129 0.953139 7.05253 1.20064 7.30004C1.44815 7.54692 1.84939 7.54692 2.0969 7.30004L4.50058 4.89636L6.90378 7.30004C7.15128 7.54692 7.55191 7.54692 7.79941 7.30004C8.04692 7.05253 8.04692 6.65129 7.79941 6.40378L5.39621 4.00058L7.79941 1.5969C8.04692 1.3494 8.04692 0.948151 7.79941 0.700647C7.68066 0.581896 7.51941 0.515015 7.35191 0.515015C7.18378 0.515015 7.02253 0.58189 6.90378 0.700647L4.50058 3.10433L2.0969 0.700647C1.97752 0.581896 1.8169 0.515015 1.64877 0.515015Z'></path>
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
