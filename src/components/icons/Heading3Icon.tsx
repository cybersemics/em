import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Heading3 icon. */
const Heading3Icon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
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
          <g id='_20-heading3' data-name='20-heading3'>
            <rect width='24' height='24' fill='none' />
            <path d='M3,18.18V6.72H4.53v4.71h6V6.72H12V18.18H10.48v-5.4H4.53v5.4Z' fill={strokeColor} />
            <path
              d='M14,15.15,15.37,15a3.08,3.08,0,0,0,.82,1.72,2,2,0,0,0,1.42.53,2.29,2.29,0,0,0,1.68-.69,2.35,2.35,0,0,0,.68-1.7,2.16,2.16,0,0,0-.63-1.6,2.2,2.2,0,0,0-1.61-.63,3.85,3.85,0,0,0-1,.16l.16-1.24.23,0a2.89,2.89,0,0,0,1.61-.47,1.61,1.61,0,0,0,.72-1.45,1.71,1.71,0,0,0-.52-1.28,1.86,1.86,0,0,0-1.35-.51,2,2,0,0,0-1.37.52,2.58,2.58,0,0,0-.7,1.55L14.1,9.65a3.55,3.55,0,0,1,1.17-2.19,3.39,3.39,0,0,1,2.28-.78,3.69,3.69,0,0,1,1.72.4,2.94,2.94,0,0,1,1.21,1.1,2.78,2.78,0,0,1,.42,1.47A2.41,2.41,0,0,1,20.5,11a2.71,2.71,0,0,1-1.18,1,2.71,2.71,0,0,1,1.58,1,3,3,0,0,1,.56,1.85,3.37,3.37,0,0,1-1.09,2.54,3.87,3.87,0,0,1-2.77,1,3.59,3.59,0,0,1-2.5-.9A3.43,3.43,0,0,1,14,15.15Z'
              fill={strokeColor}
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default Heading3Icon
