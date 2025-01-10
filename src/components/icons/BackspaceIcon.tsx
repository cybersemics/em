import { css, cx } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'

/** Backspace key Icon */
const BackspaceIcon = ({ cssRaw, fill, style, size = 20 }: IconType) => {
  return (
    <svg
      className={cx(css(cssRaw))} // !!! icon recipe
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill={fill || token('colors.fg')}
      style={{...style}}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fill-rule="evenodd" clip-rule="evenodd" d="M17.5 0.833333H2.5C1.57953 0.833333 0.833333 1.57953 0.833333 2.5V17.5C0.833333 18.4205 1.57953 19.1667 2.5 19.1667H17.5C18.4205 19.1667 19.1667 18.4205 19.1667 17.5V2.5C19.1667 1.57953 18.4205 0.833333 17.5 0.833333ZM2.5 0C1.11929 0 0 1.11929 0 2.5V17.5C0 18.8807 1.11929 20 2.5 20H17.5C18.8807 20 20 18.8807 20 17.5V2.5C20 1.11929 18.8807 0 17.5 0H2.5Z" fill="white" fill-opacity="0.3"/>
      <path d="M8.65094 13L5.63839 9.9697L8.65094 6.93939H14.3091V13H8.65094ZM8.91431 12.349H13.6699V7.59044H8.91431L6.54689 9.9697L8.91431 12.349ZM12.5069 11.3073L12.0748 11.7453L8.95574 8.6321L9.3878 8.19413L12.5069 11.3073ZM9.3878 11.7453L8.95574 11.3073L12.0748 8.19413L12.5069 8.6321L9.3878 11.7453Z" fill="white" fill-opacity="0.55"/>
    </svg>

  )
}

export default BackspaceIcon