import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/13-help_2.json'

/** Help Icon with Conditional Lottie Animation. */
const HelpIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(-1%, 0) scale(0.97, 0.97)' }}
      >
        <rect width='24' height='24' fill='none' />
        <path
          d='M12.22,13.51v-.23a1.76,1.76,0,0,1,.94-1.49,1.69,1.69,0,0,0,.91-1.45,1.85,1.85,0,1,0-3.7,0'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          fill='none'
        />
        <path
          d='M12.21,16.18h0'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          fill='none'
          strokeWidth='1.5'
        />
        <circle cx='12.22' cy='12' r='9.85' fill='none' stroke='currentColor' strokeLinejoin='round' />
      </svg>
    </AnimatedIcon>
  )
}

export default HelpIcon
