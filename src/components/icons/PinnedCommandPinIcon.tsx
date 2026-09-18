import { useId } from 'react'
import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'

/** Document icon for the Pin Command row. */
const PinnedCommandPinIcon = ({ cssRaw, fill, size = 24, style }: IconType) => {
  const maskId = useId()
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
        <mask id={maskId} maskUnits='userSpaceOnUse' x='10' y='13' width='9' height='10'>
          <path
            d='M18.1172 22.7002H10V13.5H18.1172V22.7002ZM13.9727 13.8379L12.0791 14.6504L11.9844 14.6904L11.9541 14.7881L10.3301 19.9287L10.293 20.0469L10.374 20.1406L11.9971 22.0352L12.1777 22.2461L12.3447 22.0234L14.7803 18.7764L14.8242 18.7168V14.4922L14.7598 14.4268L14.2178 13.8857L14.1113 13.7783L13.9727 13.8379Z'
            fill='white'
            stroke='none'
          />
        </mask>
        <g mask={`url(#${maskId})`}>
          <circle cx='14.87' cy='18.9129' r='2.25491' strokeWidth='0.901963' />
        </g>
      </g>
    </svg>
  )
}

export default PinnedCommandPinIcon
