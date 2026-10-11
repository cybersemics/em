import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'

/** Document icon for the Unpin Command row. */
const PinnedCommandUnpinIcon = ({ cssRaw, fill, size = 24, style }: IconType) => {
  const strokeColor = fill || token('colors.fg')

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      className={cx(iconRecipe(), css(cssRaw))}
      style={style}
      aria-hidden='true'
    >
      <g opacity='0.96' stroke={strokeColor}>
        <rect x='4.5' y='0.5' width='15' height='23' rx='2.46471' />
        <g opacity='0.35'>
          <line x1='8.69922' y1='4.90234' x2='17.6992' y2='4.90234' />
          <line x1='9.70703' y1='7.89844' x2='17.507' y2='7.89844' />
          <line x1='7.50781' y1='7.89844' x2='8.70781' y2='7.89844' />
          <line x1='6.5' y1='4.90234' x2='7.7' y2='4.90234' />
          <line x1='7.50781' y1='10.8984' x2='8.70781' y2='10.8984' />
          <line x1='9.70703' y1='10.8984' x2='17.507' y2='10.8984' />
        </g>
        <circle opacity='0.32' cx='14.87' cy='18.909' r='2.25491' strokeWidth='0.901963' />
        <line x1='12.4' y1='21.2' x2='17.3' y2='16.5' strokeWidth='0.901963' />
      </g>
    </svg>
  )
}

export default PinnedCommandUnpinIcon
