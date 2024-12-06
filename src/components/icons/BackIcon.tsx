import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/06-back.json'

/** Back Icon with Conditional Lottie Animation. */
const BackIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: `scale(1.05, 1.05)` }}
      >
        <rect width='24' height='24' fill='none' />
        <path
          d='M8.17,18.16l-5.6-5.61a.77.77,0,0,1,0-1.1l5.6-5.6'
          stroke='currentColor'
          strokeLinejoin='round'
          fill='none'
        />
        <line x1='2.34' y1='12.01' x2='21.08' y2='12.01' stroke='currentColor' strokeLinejoin='round' fill='none' />
      </svg>
    </AnimatedIcon>
  )
}

export default BackIcon
