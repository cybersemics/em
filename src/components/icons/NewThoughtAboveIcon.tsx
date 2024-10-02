import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { FONT_SCALING_FACTOR } from '../../constants'

/** New Thought Above icon. */
const NewThoughtAboveIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
  const newSize = size * FONT_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')
  const fillColor = style.fill || fill || token('colors.fg') // Fill color for circle

  return (
    <svg
      className={icon({ className })}
      xmlns='http://www.w3.org/2000/svg'
      width={newSize}
      height={newSize}
      viewBox='0 0 24 24'
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }}
      fill='none'
    >
      <rect width='24' height='24' fill='none' />
      <circle cx='3.56' cy='16.88' r='1.25' fill={fillColor} />
      <line x1='21.69' y1='7.27' x2='9.23' y2='7.27' stroke={strokeColor} strokeLinejoin='round' fill='none' />
      <line x1='21.69' y1='16.88' x2='9.23' y2='16.88' stroke={strokeColor} strokeLinejoin='round' fill='none' />
      <line x1='4.31' y1='9.27' x2='4.31' y2='5.27' stroke={strokeColor} strokeLinecap='round' fill='none' />
      <line x1='2.31' y1='7.27' x2='6.31' y2='7.27' stroke={strokeColor} strokeLinecap='round' fill='none' />
    </svg>
  )
}

export default NewThoughtAboveIcon
