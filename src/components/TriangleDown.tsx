import { token } from '../../styled-system/tokens'
import Icon from '../@types/IconType'

/** A down-facing triangle component. */
const TriangleDown = ({ fill = token('colors.bg'), size = 20, width, height, style, className }: Icon) => (
  <svg
    xmlns=''
    version='1.1'
    width={width || (height ? height / 2 : size)}
    height={height || (width ? width * 2 : size)}
    fill={fill}
    style={style}
    className={className}
    viewBox='0 0 10 10'
  >
    <polygon points='0,5 5,0 10,5' />
  </svg>
)

export default TriangleDown
