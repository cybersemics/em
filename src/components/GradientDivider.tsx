import { css } from '../../styled-system/css'

/** Centered gradient hairline with the dialog's overlay blend treatment. */
const GradientDivider = () => (
  <div
    aria-hidden='true'
    className={css({
      width: '100%',
      maxWidth: '264px',
      height: '1px',
      marginInline: 'auto',
      // eslint-disable-next-line @pandacss/prefer-token -- every color in the gradient is a token reference
      background:
        'linear-gradient(to right, {colors.transparent} 0%, {colors.white} 50%, {colors.transparent} 100%)',
      mixBlendMode: 'overlay',
      pointerEvents: 'none',
      opacity: 0.25,
    })}
  />
)

export default GradientDivider
