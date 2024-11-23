import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/25-clear-thought.json'

/** Clear Thought Icon with Conditional Lottie Animation. */
const ClearThoughtIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: `translate(-2%, 3%) scale(0.98, 0.98)` }}
      >
        <rect width='24' height='24' fill='none' />
        <path
          d='M4.55,8.34H17.08a1,1,0,0,1,1,1v7.09a1,1,0,0,1-1,1H4.55a3,3,0,0,1-3-3V11.34a3,3,0,0,1,3-3Z'
          transform='translate(-5.75 8.39) rotate(-36.6)'
          stroke='currentColor'
          fill='none'
        />
        <line x1='6.71' y1='20.27' x2='21.04' y2='20.27' stroke='currentColor' fill='none' />
        <line x1='5.35' y1='10.55' x2='10.83' y2='17.8' stroke='currentColor' fill='none' />
      </svg>
    </AnimatedIcon>
  )
}

export default ClearThoughtIcon
