import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/16-move-thought-up.json'

/** Move Thought Up Icon with Conditional Lottie Animation. */
const MoveThoughtUpIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(-1%, 1%) scale(0.97, 0.97)' }}
      >
        <rect fill='none' width='24' height='24' />
        <line stroke='currentColor' strokeLinejoin='round' fill='none' x1='15.11' y1='4.88' x2='22.5' y2='4.88' />
        <line stroke='currentColor' strokeLinejoin='round' fill='none' x1='15.11' y1='12' x2='22.5' y2='12' />
        <circle fill='currentColor' cx='10.65' cy='4.87' r='1' />
        <circle fill='currentColor' cx='10.65' cy='12' r='1' />
        <line stroke='currentColor' strokeLinejoin='round' fill='none' x1='15.11' y1='19.13' x2='22.5' y2='19.13' />
        <circle fill='currentColor' cx='10.65' cy='19.13' r='1' />
        <line stroke='currentColor' strokeLinejoin='round' fill='none' x1='4.02' y1='11' x2='4.02' y2='3.3' />
        <polyline stroke='currentColor' strokeLinejoin='round' fill='none' points='5.71 5.06 3.96 3.31 2.2 5.06' />
      </svg>
    </AnimatedIcon>
  )
}

export default MoveThoughtUpIcon
