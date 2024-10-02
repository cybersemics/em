import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { FONT_SCALING_FACTOR } from '../../constants'

/** New Subthought Above icon. */
const NewSubthoughtAboveIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
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
      <line x1='16.14' y1='5.18' x2='7.05' y2='5.18' stroke={strokeColor} strokeLinejoin='round' fill='none' />
      <line x1='22.61' y1='20.07' x2='7.05' y2='20.07' stroke={strokeColor} strokeLinejoin='round' fill='none' />
      <circle cx='2.39' cy='5.18' r='1.25' fill={fillColor} />
      <line x1='22.61' y1='12.63' x2='14.5' y2='12.63' stroke={strokeColor} strokeLinejoin='round' fill='none' />
      <line x1='9.05' y1='10.62' x2='9.05' y2='14.62' stroke={strokeColor} strokeLinecap='round' fill='none' />
      <line x1='7.05' y1='12.62' x2='11.05' y2='12.62' stroke={strokeColor} strokeLinecap='round' fill='none' />
    </svg>
  )
}

export default NewSubthoughtAboveIcon
