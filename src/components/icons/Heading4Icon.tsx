import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Heading4 icon. */
const Heading4Icon = ({ fill, size = 20, style = {}, className }: IconType) => {
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
          <g id='_21-heading4' data-name='21-heading4'>
            <rect width='24' height='24' fill='none' />
            <path d='M2.68,18.18V6.72H4.19v4.71h6V6.72h1.51V18.18H10.15v-5.4h-6v5.4Z' fill={strokeColor} />
            <path
              d='M18.12,18.18V15.44h-5V14.15l5.23-7.43h1.15v7.43h1.55v1.29H19.53v2.74Zm0-4V9l-3.58,5.17Z'
              fill={strokeColor}
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default Heading4Icon
