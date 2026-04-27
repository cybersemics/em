import { FC } from 'react'
import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'

/** Slim X icon used by the Commands dialog circular Close button. */
const XIcon: FC<IconType> = ({ size = 24, fill, cssRaw }) => {
  const fillColor = fill || token('colors.fg')

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      className={cx(iconRecipe(), css(cssRaw))}
    >
      <path
        d='M18.1098 5.15762C18.3122 4.95521 18.6397 4.95537 18.8422 5.15762C19.0447 5.36011 19.0447 5.68754 18.8422 5.89004L12.7318 11.9994L18.8422 18.1098C19.0447 18.3123 19.0447 18.6407 18.8422 18.8432C18.6398 19.0451 18.3121 19.0451 18.1098 18.8432L11.9994 12.7328L5.89004 18.8432C5.68765 19.0451 5.36001 19.0451 5.15762 18.8432C4.95535 18.6407 4.9552 18.3122 5.15762 18.1098L11.267 11.9994L5.15762 5.89004C4.95535 5.68753 4.9552 5.36004 5.15762 5.15762C5.36004 4.9552 5.68753 4.95535 5.89004 5.15762L11.9994 11.267L18.1098 5.15762Z'
        fill={fillColor}
      />
    </svg>
  )
}

export default XIcon
