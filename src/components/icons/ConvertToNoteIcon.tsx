import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Convert To Note icon. */
const ConvertToNoteIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
  const newSize = size * ICON_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')

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
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='24-convert-to-note' data-name='24-convert-to-note'>
            <rect width='24' height='24' fill='none' />
            <polyline
              points='10.24 12.09 8.74 10.59 7.24 12.09'
              fill='none'
              stroke={strokeColor}
              strokeLinejoin='round'
            />
            <path
              d='M12.93,17.61h0A3.65,3.65,0,0,1,8.74,14V10.59'
              fill='none'
              stroke={strokeColor}
              strokeLinejoin='round'
            />
            <polyline
              points='13.74 12.98 15.24 14.48 16.74 12.98'
              fill='none'
              stroke={strokeColor}
              strokeLinejoin='round'
            />
            <path
              d='M11.05,7.46h0a3.65,3.65,0,0,1,4.19,3.61v3.41'
              fill='none'
              stroke={strokeColor}
              strokeLinejoin='round'
            />
            <path
              d='M8.14,2v3a1,1,0,0,1-1,1H4'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <path
              d='M8.48,2H18.75a1,1,0,0,1,1,1V20.41a1,1,0,0,1-1,1H4.92a1,1,0,0,1-1-1v-14a3,3,0,0,1,.24-1.18h0a5.52,5.52,0,0,1,3-2.95l.2-.08A3.06,3.06,0,0,1,8.48,2Z'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default ConvertToNoteIcon
