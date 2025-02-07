import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/09-next-thought_2.json'

/** Next Icon with Conditional Lottie Animation. */
const NextIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: `translate(-7%, 0%) scale(0.98, 0.98)` }}
      >
        <rect width='24' height='24' fill='none' />
        <path
          d='M12.13,1.55V7.11H14.7a3.8,3.8,0,0,1,3.8,3.79h0a3.8,3.8,0,0,1-3.8,3.8H12.13v7.61'
          stroke='currentColor'
          strokeLinejoin='round'
          fill='none'
        />
        <path d='M15.13,19.31l-3,3-3-3' stroke='currentColor' strokeLinejoin='round' fill='none' />
      </svg>
    </AnimatedIcon>
  )
}

export default NextIcon
