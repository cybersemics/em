import { css, cx } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'

/** + key Icon */
const PlusIcon = ({ cssRaw, fill, style, size = 5 }: IconType) => {
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
      <path d="M0 2.712V1.9614H1.948V0H2.712V1.9614H4.66V2.712H2.712V4.66894H1.948V2.712H0Z" fill="white" fill-opacity="0.55"/>
    </svg>
  )
}

export default PlusIcon