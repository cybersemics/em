import { FC } from 'react'
import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'

/** A bulleted-list icon — shown by the Bullet Picker toolbar button. Three rows, each with a filled bullet and a line of text. */
const BulletStyleIcon: FC<IconType> = ({ size = 18, fill, style = {}, cssRaw }) => {
  const color = style.fill || fill || token('colors.fg')

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      style={style}
      className={cx(iconRecipe(), css(cssRaw))}
    >
      <rect width='24' height='24' fill='none' />
      <circle cx='4.5' cy='6' r='1.5' fill={color} />
      <circle cx='4.5' cy='12' r='1.5' fill={color} />
      <circle cx='4.5' cy='18' r='1.5' fill={color} />
      <line stroke={color} strokeLinecap='round' strokeWidth='1.5' x1='9' y1='6' x2='20' y2='6' />
      <line stroke={color} strokeLinecap='round' strokeWidth='1.5' x1='9' y1='12' x2='20' y2='12' />
      <line stroke={color} strokeLinecap='round' strokeWidth='1.5' x1='9' y1='18' x2='20' y2='18' />
    </svg>
  )
}

export default BulletStyleIcon
