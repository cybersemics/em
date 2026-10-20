import { token } from '../../styled-system/tokens'
import IconType from '../@types/IconType'

/** A left-facing svg triangle. */
const TriangleLeft = ({ fill = token('colors.bg'), size = 20, width, height, style, className }: IconType) => (
  <svg
    xmlns=''
    version='1.1'
    width={width || (height ? height / 2 : size)}
    height={height || (width ? width * 2 : size)}
    fill={fill}
    style={style}
    viewBox='0 0 5 10'
    className={className}
  >
    <polygon points='0,5 5,0 5,10' />
  </svg>
)

export default TriangleLeft
