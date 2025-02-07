import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/08-jump-forward.json'

/** JumpForward Icon with Conditional Lottie Animation. */
const JumpForwardIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'scale(0.98, 0.98)' }}
      >
        <rect width='24' height='24' fill='none' />
        <path d='M17,6.44,22,11.52a.72.72,0,0,1,0,1L17,17.6' stroke='currentColor' strokeLinejoin='round' fill='none' />
        <path
          d='M22.24,12H4.07a2.31,2.31,0,0,0-2.26,2.8h0a2.32,2.32,0,0,0,2.66,1.8l.78-.14A2.31,2.31,0,0,0,7,13.33L4.49,7.05'
          stroke='currentColor'
          strokeLinejoin='round'
          fill='none'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default JumpForwardIcon
