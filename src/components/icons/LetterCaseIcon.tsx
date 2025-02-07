import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Letter-case icon. */
const LetterCaseIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
  const newSize = size * ICON_SCALING_FACTOR // Ensure sizing follows scaling factor
  const strokeColor = style.fill || fill || token('colors.fg') // Calculate stroke color

  return (
    <svg
      className={cx(iconRecipe(), css(cssRaw))} // Combine class names
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24' // Keep the original viewBox
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }} // Inline styles
      fill='none'
      strokeWidth='1'
      strokeLinecap='round'
      strokeLinejoin='round'
      stroke={strokeColor}
    >
      <path stroke='none' d='M0 0h24v24H0z' fill='none' />
      <path fill='none' d='M17.5 15.5m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0' />
      <path fill='none' d='M3 19v-10.5a3.5 3.5 0 0 1 7 0v10.5' />
      <path fill='none' d='M3 13h7' />
      <path fill='none' d='M21 12v7' />
    </svg>
  )
}

export default LetterCaseIcon
