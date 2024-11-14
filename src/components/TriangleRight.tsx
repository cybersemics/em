import { css } from '../../styled-system/css'
import IconType from '../@types/IconType'
import { ICON_SCALING_FACTOR } from '../constants'

/** A right-facing triangle component. */
const TriangleRight = ({ fill = 'black', size = 20, width, height, style, cssRaw }: IconType) => (
  <svg
    xmlns=''
    version='1.1'
    width={(width || (height ? height / 2 : size)) * ICON_SCALING_FACTOR}
    height={(height || (width ? width * 2 : size)) * ICON_SCALING_FACTOR}
    fill={fill}
    style={style}
    viewBox='0 0 5 10'
    className={css(cssRaw)}
  >
    <polygon points='0,0 5,5 0,10' />
  </svg>
)

export default TriangleRight
