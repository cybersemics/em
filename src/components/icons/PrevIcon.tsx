import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/10-previous-thought_2.json'

/** Prev Icon with Conditional Lottie Animation. */
const PrevIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: `translate(6%, 0) scale(0.99, 0.99)` }}
      >
        <rect width='24' height='24' fill='none' />
        <path
          d='M12.2,22.31V16.75H9.62A3.8,3.8,0,0,1,5.82,13h0a3.8,3.8,0,0,1,3.8-3.8H12.2V1.55'
          stroke='currentColor'
          strokeLinejoin='round'
          fill='none'
        />
        <path d='M9.2,4.55l3-3,3,3' stroke='currentColor' strokeLinejoin='round' fill='none' />
      </svg>
    </AnimatedIcon>
  )
}

export default PrevIcon
