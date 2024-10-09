import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Join Thoughts icon. */
const JoinThoughtsIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
  const newSize = size * ICON_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')

  return (
    <svg
      className={cx(icon(), css(cssRaw))}
      xmlns='http://www.w3.org/2000/svg'
      width={newSize}
      height={newSize}
      viewBox='0 0 24 24'
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }}
      fill='none'
    >
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_30-join-thought' data-name='30-join-thought'>
            <rect fill='none' width='24' height='24' />
            <path
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              d='M12,6.08a1.62,1.62,0,0,1-1.61,1.61v2.66H7.71a1.62,1.62,0,0,0-3.23,0H2.05V2h8.34V4.47A1.62,1.62,0,0,1,12,6.08Z'
            />
            <path
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              d='M18.72,2v8.34H16.13a1.61,1.61,0,0,1-3.22,0H10.39V7.69a1.61,1.61,0,0,0,0-3.22V2Z'
            />
            <path
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              d='M22.07,14.77V22.2H14.64V19.86a1.43,1.43,0,1,1,0-2.86V14.77h2.24a1.44,1.44,0,1,0,2.88,0Z'
            />
            <path
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              d='M8.78,14.45a1.6,1.6,0,0,0,1.61,1.61v2.62H2.05V10.35H4.48a1.62,1.62,0,0,1,3.23,0h2.68v2.5A1.6,1.6,0,0,0,8.78,14.45Z'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default JoinThoughtsIcon
