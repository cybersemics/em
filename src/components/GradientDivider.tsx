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
      background:
        'linear-gradient(to right, rgba(255, 255, 255, 0) 0%, {colors.white} 50%, rgba(255, 255, 255, 0) 100%)',
      mixBlendMode: 'overlay',
      pointerEvents: 'none',
    })}
  />
)

export default GradientDivider
