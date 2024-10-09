import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** CommandPalette icon. */
const CommandPaletteIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
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
          <g id='_27-command-palette' data-name='27-command-palette'>
            <rect className='cls-1' width='24' height='24' fill='none' />
            <path
              className='cls-2'
              d='M15.41,12v6.25a2.71,2.71,0,1,0,2.7-2.71H5.48a2.71,2.71,0,1,0,2.71,2.71V5.62A2.71,2.71,0,1,0,5.48,8.33H18.11a2.71,2.71,0,1,0-2.7-2.71Z'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default CommandPaletteIcon
