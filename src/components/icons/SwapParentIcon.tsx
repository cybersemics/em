import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'

/**
 *
 */
const SwapParentIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
  const scalingFactor = 1.37
  const newSize = size * scalingFactor
  const strokeColor = style.fill || fill || token('colors.fg')

  return (
    <svg
      className={icon({ className })}
      xmlns='http://www.w3.org/2000/svg'
      width={newSize}
      height={newSize}
      viewBox='0 0 24 24'
      style={{
        ...style,
        width: `${newSize}px`,
        height: `${newSize}px`,
      }}
    >
      <title>Swap Parent Icon</title>
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_17-swap-parent' data-name='17-swap-parent'>
            <rect width='24' height='24' fill='none' />
            <path
              d='M13.05,20.26l-7.52-3.8a6.91,6.91,0,0,1,1-12.72'
              fill='none'
              stroke={strokeColor}
              strokeLinejoin='round'
            />
            <path
              d='M11.06,3.4l7.52,3.8a6.91,6.91,0,0,1-1,12.72'
              fill='none'
              stroke={strokeColor}
              strokeLinejoin='round'
            />
            <polyline
              points='12.03 6.38 11.06 3.4 14.04 2.43'
              fill='none'
              stroke={strokeColor}
              strokeLinejoin='round'
            />
            <polyline
              points='10.04 21.29 13.02 20.32 12.05 17.34'
              fill='none'
              stroke={strokeColor}
              strokeLinejoin='round'
            />
            <circle cx='12.05' cy='11.83' r='2' fill={strokeColor} opacity='0.3' />
            <circle cx='12.05' cy='11.83' r='1.16' fill={strokeColor} />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default SwapParentIcon
