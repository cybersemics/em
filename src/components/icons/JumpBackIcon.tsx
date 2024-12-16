import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/07-jump-back.json'

/** JumpBack Icon with Conditional Lottie Animation. */
const JumpBackIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(5%, 0)' }}
      >
        <rect width='24' height='24' fill='none' />
        <path
          d='M6.92,17.6,1.84,12.52a.7.7,0,0,1,0-1L6.92,6.44'
          stroke='currentColor'
          strokeLinejoin='round'
          fill='none'
        />
        <path
          d='M1.63,12H19.8a2.31,2.31,0,0,0,2.26-2.79h0a2.31,2.31,0,0,0-2.66-1.8l-.78.14a2.31,2.31,0,0,0-1.75,3.13L19.38,17'
          stroke='currentColor'
          strokeLinejoin='round'
          fill='none'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default JumpBackIcon
