import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { FONT_SCALING_FACTOR } from '../../constants'

/** Heading5 icon. */
const Heading5Icon = ({ fill, size = 20, style = {}, className }: IconType) => {
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
          <g id='_22-heading5' data-name='22-heading5'>
            <rect width='24' height='24' fill='none' />
            <path d='M3.63,18.18V6.72H5.14v4.71h6V6.72h1.51V18.18H11.1v-5.4h-6v5.4Z' fill={strokeColor} />
            <path
              d='M14.56,15.18,16,15.05a2.63,2.63,0,0,0,.76,1.62,2,2,0,0,0,1.44.55A2.25,2.25,0,0,0,20,16.45a2.89,2.89,0,0,0,.71-2,2.63,2.63,0,0,0-.68-1.9,2.37,2.37,0,0,0-1.77-.69,2.44,2.44,0,0,0-1.23.31,2.37,2.37,0,0,0-.86.8l-1.32-.18,1.11-5.88h5.7V8.22H17.05l-.62,3.08a3.74,3.74,0,0,1,2.17-.72,3.44,3.44,0,0,1,2.53,1,3.69,3.69,0,0,1,1,2.68A4.12,4.12,0,0,1,21.25,17a3.62,3.62,0,0,1-3,1.39,3.72,3.72,0,0,1-2.55-.87A3.44,3.44,0,0,1,14.56,15.18Z'
              fill={strokeColor}
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default Heading5Icon
