import { css, cx } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'

/** + key Icon */
const ShiftIcon = ({ cssRaw, fill, style, size = 20 }: IconType) => {
  return (
    <svg
      className={cx(css(cssRaw))}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill={fill || token('colors.fg')}
      style={{...style}}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fill-rule="evenodd" clip-rule="evenodd" d="M17 1H3C1.89543 1 1 1.89543 1 3V17C1 18.1046 1.89543 19 3 19H17C18.1046 19 19 18.1046 19 17V3C19 1.89543 18.1046 1 17 1ZM3 0C1.34315 0 0 1.34315 0 3V17C0 18.6569 1.34315 20 3 20H17C18.6569 20 20 18.6569 20 17V3C20 1.34315 18.6569 0 17 0H3Z" fill="white" fill-opacity="0.3"/>
      <path d="M5.79679 10.3636L10.0013 6.15909L14.2059 10.3636H12.0468V14H7.95588V10.3636H5.79679ZM7.39125 9.72443H8.6661V13.3608H11.3366V9.72443H12.6114L10.0013 7.11435L7.39125 9.72443Z" fill="white" fill-opacity="0.55"/>
    </svg>
  )
}

export default ShiftIcon