import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'

/** Italic icon. */
const ItalicTextIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
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
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }}
      fill='none'
    >
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_14-italic' data-name='14-italic'>
            <rect width='24' height='24' fill='none' />
            <path d='M9.63,2.88h9.24' fill='none' stroke={strokeColor} strokeLinecap='round' strokeLinejoin='round' />
            <path d='M5.13,20.88h9.24' fill='none' stroke={strokeColor} strokeLinecap='round' strokeLinejoin='round' />
            <path
              d='M14.25,2.88l-4.5,18'
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

export default ItalicTextIcon
