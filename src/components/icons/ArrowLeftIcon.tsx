import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'
import iconClassName from '../../util/iconClassName'

/** Arrow-left icon used by the Command Universe Back button and the Navigate Back command. */
const ArrowLeftIcon = ({ size = 24, fill, cssRaw }: IconType) => {
  const strokeColor = fill || token('colors.fg')

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      className={iconClassName(cssRaw)}
    >
      <path d='M12 19L5 12M5 12L12 5M5 12H19' stroke={strokeColor} strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  )
}

export default ArrowLeftIcon
