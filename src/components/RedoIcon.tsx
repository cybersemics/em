import IconType from '../@types/IconType'
import AnimatedIcon from './icons/AnimatedIcon'
import animationData from './icons/animations/02-redo_2.json'

/** Redo Icon with Conditional Lottie Animation. */
const RedoIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        style={{ ...style, width: '100%', height: '100%', transform: 'scale(0.96, 0.96)' }}
        fill='none'
      >
        <g id='Layer_2' data-name='Layer 2'>
          <g id='Layer_3' data-name='Layer 3'>
            <g id='_02-redo' data-name='02-redo'>
              <rect width='24' height='24' fill='none' />
              <path
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                fill='none'
                d='M19.76,7.24a10.24,10.24,0,0,0-2-2.11,8.67,8.67,0,1,0,1.57,12.16'
              />
              <path
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                fill='none'
                d='M16.06,7.71l4.17.11L20,3.43'
              />
            </g>
          </g>
        </g>
      </svg>
    </AnimatedIcon>
  )
}

export default RedoIcon
