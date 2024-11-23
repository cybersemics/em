import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/23-normal-text.json'

/** Normal Text Icon with Conditional Lottie Animation. */
const NormalTextIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(0, -3%) scale(1, 1)' }}
      >
        <rect width='24' height='24' fill='none' />
        <path
          d='M12,21.39V4'
          fill='none'
          stroke={fill || 'currentColor'}
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M10.11,21.39h3.78'
          fill='none'
          stroke={fill || 'currentColor'}
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M19.06,7.3V4.87a1,1,0,0,0-1-1H5.94a1,1,0,0,0-1,1V7.3'
          fill='none'
          stroke={fill || 'currentColor'}
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default NormalTextIcon
