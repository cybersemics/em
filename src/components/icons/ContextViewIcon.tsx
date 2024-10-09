import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Context View Icon. */
const ContextViewIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
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
          <g id='_18-context-view' data-name='18-context-view'>
            <rect width='24' height='24' fill='none' />
            <path className='cls-2' d='M14,4.47a2,2,0,1,0-2,2A2,2,0,0,0,14,4.47Z' fill='none' stroke={strokeColor} />
            <path className='cls-2' d='M6,4.47a2,2,0,1,0-2,2A2,2,0,0,0,6,4.47Z' fill='none' stroke={strokeColor} />
            <path className='cls-2' d='M22,4.47a2,2,0,1,0-2,2A2,2,0,0,0,22,4.47Z' fill='none' stroke={strokeColor} />
            <path className='cls-2' d='M14,20.47a2,2,0,1,0-2,2A2,2,0,0,0,14,20.47Z' fill='none' stroke={strokeColor} />
            <path className='cls-2' d='M12,18.47v-12' fill='none' stroke={strokeColor} />
            <path className='cls-2' d='M20,6.47v5a2,2,0,0,1-2,2H6a2,2,0,0,1-2-2v-5' fill='none' stroke={strokeColor} />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default ContextViewIcon
