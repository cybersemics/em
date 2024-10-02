import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { FONT_SCALING_FACTOR } from '../../constants'

/** New Subthought Next icon. */
const NewSubthoughtNextIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
  const newSize = size * FONT_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')
  const fillColor = style.fill || fill || token('colors.fg') // Fill color for the circle

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
      <line x1='1.47' y1='3.56' x2='17.03' y2='3.56' stroke={strokeColor} strokeLinejoin='round' fill='none' />
      <circle cx='9.18' cy='11' r='1.25' fill={fillColor} />
      <line x1='22.28' y1='11' x2='13.83' y2='11' stroke={strokeColor} strokeLinejoin='round' fill='none' />
      <line x1='18.05' y1='18.44' x2='8.92' y2='18.44' stroke={strokeColor} strokeLinejoin='round' fill='none' />
      <line x1='3.47' y1='20.44' x2='3.47' y2='16.44' stroke={strokeColor} strokeLinecap='round' fill='none' />
      <line x1='1.47' y1='18.44' x2='5.47' y2='18.44' stroke={strokeColor} strokeLinecap='round' fill='none' />
    </svg>
  )
}

export default NewSubthoughtNextIcon
