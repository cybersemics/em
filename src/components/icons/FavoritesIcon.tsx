import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Favorites icon. */
const FavoritesIcon = ({ fill, size = 14, style = {}, cssRaw }: IconType) => {
  const newSize = size * ICON_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')

  return (
    <svg
      className={cx(icon(), css(cssRaw))}
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='none'
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }}
    >
      <rect width='24' height='24' fill='none' />
      <path
        d='M12.53,2.55l2.85,5.32a.56.56,0,0,0,.42.31l5.95,1.07a.59.59,0,0,1,.32,1l-4.18,4.36a.56.56,0,0,0-.16.49l.82,6a.6.6,0,0,1-.85.62l-5.44-2.64a.59.59,0,0,0-.52,0L6.3,21.71a.6.6,0,0,1-.85-.62l.82-6a.56.56,0,0,0-.16-.49L1.93,10.25a.59.59,0,0,1,.32-1L8.2,8.18a.56.56,0,0,0,.42-.31l2.85-5.32A.6.6,0,0,1,12.53,2.55Z'
        stroke={strokeColor}
        strokeLinecap='round'
        strokeLinejoin='round'
        fill='none'
      />
    </svg>
  )
}

export default FavoritesIcon
