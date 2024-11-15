import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import Icon from '../@types/IconType'

/** A right-facing triangle component. */
const TriangleRight = ({ fill = token('colors.bg'), size = 20, width, height, style, cssRaw }: Icon) => (
  <svg
    xmlns=''
    version='1.1'
    width={width || (height ? height / 2 : size)}
    height={height || (width ? width * 2 : size)}
    fill={fill}
    style={style}
    viewBox='0 0 5 10'
    className={css(cssRaw)}
  >
    <polygon points='0,0 5,5 0,10' />
  </svg>
)

export default TriangleRight
