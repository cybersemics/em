import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { FONT_SCALING_FACTOR } from '../../constants'

/** Heading2 icon. */
const Heading2Icon = ({ fill, size = 20, style = {}, className }: IconType) => {
  const newSize = size * FONT_SCALING_FACTOR
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
          <g id='_19-heading2' data-name='19-heading2'>
            <rect width='24' height='24' fill='none' />
            <path d='M3.3,18.18V6.72H4.82v4.71h5.95V6.72h1.52V18.18H10.77v-5.4H4.82v5.4Z' fill={strokeColor} />
            <path
              d='M21.63,16.83v1.35H14.06a2.49,2.49,0,0,1,.16-1,5.28,5.28,0,0,1,.93-1.52A14.59,14.59,0,0,1,17,13.94a15.69,15.69,0,0,0,2.52-2.42,2.9,2.9,0,0,0,.66-1.69,1.87,1.87,0,0,0-.6-1.41A2.14,2.14,0,0,0,18,7.84a2.21,2.21,0,0,0-1.62.61,2.32,2.32,0,0,0-.62,1.69L14.33,10a3.51,3.51,0,0,1,1.11-2.46A3.81,3.81,0,0,1,18,6.68a3.62,3.62,0,0,1,2.61.91,3,3,0,0,1,1,2.27,3.37,3.37,0,0,1-.28,1.35,5.22,5.22,0,0,1-.93,1.4,21.81,21.81,0,0,1-2.17,2Q17,15.69,16.61,16.06a5,5,0,0,0-.6.77Z'
              fill={strokeColor}
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default Heading2Icon
