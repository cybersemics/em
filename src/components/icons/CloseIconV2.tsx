import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'

/** Close icon. */
const CloseIconV2 = ({ fill, width = 10, height = 11, cssRaw, style }: IconType) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox='0 0 10 11'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={cx(iconRecipe(), css(cssRaw))}
      style={style}
    >
      <path
        d='m1 1.55 7.88 7.88M1 9.43l7.88-7.88'
        stroke={fill || token('colors.fg')}
        strokeWidth='1.751'
        strokeLinecap='round'
      />
    </svg>
  )
}

export default CloseIconV2
