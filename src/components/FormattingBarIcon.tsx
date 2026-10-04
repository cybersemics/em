import { ComponentType } from 'react'
import { css } from '../../styled-system/css'
import IconType from '../@types/IconType'

/** Renders existing icon artwork in an explicitly sized frame shared by the Formatting Bar and its picker buttons. */
const FormattingBarIcon = ({
  Icon,
  size,
  style,
  fill,
  ...props
}: Omit<IconType, 'size' | 'cssRaw'> & { Icon: ComponentType<IconType>; size: number }) => (
  <span
    aria-hidden='true'
    className={css({ display: 'inline-flex', flexShrink: 0, pointerEvents: 'none' })}
    style={{ width: size, height: size }}
  >
    <Icon
      {...props}
      style={style}
      fill={style?.fill || fill}
      cssRaw={css.raw({
        // Legacy icon wrappers size themselves from the Toolbar's font. Here the frame supplies the dimensions.
        width: '100% !important',
        height: '100% !important',
        flex: 'none',
        pointerEvents: 'none',
      })}
    />
  </span>
)

export default FormattingBarIcon
