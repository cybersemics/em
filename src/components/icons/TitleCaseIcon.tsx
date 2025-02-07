import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Title-Case icon. */
const TitleCaseIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
  const newSize = size * ICON_SCALING_FACTOR // Ensure sizing follows scaling factor
  const strokeColor = style.fill || fill || token('colors.fg') // Calculate stroke color

  return (
    <svg
      className={cx(iconRecipe(), css(cssRaw))} // Combine class names
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24' // Keep the original viewBox
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }} // Inline styles
      fill='none'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      stroke={strokeColor}
    >
      <path stroke='none' d='M0 0h24v24H0z' fill='none' />
      <path d='M11 6h9' />
      <path d='M11 12h9' />
      <path d='M11 18h9' />
      <path d='M4 10v-4.5a1.5 1.5 0 0 1 3 0v4.5' />
      <path d='M4 8h3' />
      <path d='M4 20h1.5a1.5 1.5 0 0 0 0 -3h-1.5h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6z' />
    </svg>
  )
}

export default TitleCaseIcon
