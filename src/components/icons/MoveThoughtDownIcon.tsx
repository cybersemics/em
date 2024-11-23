import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/15-move-thought-down.json'

/** Move Thought Down Icon with Conditional Lottie Animation. */
const MoveThoughtDownIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(-1%, 1%) scale(0.97, 0.97)' }}
      >
        <rect fill='none' width='24' height='24' />
        <line stroke='currentColor' strokeLinejoin='round' fill='none' x1='14.98' y1='18.56' x2='22.37' y2='18.56' />
        <line stroke='currentColor' strokeLinejoin='round' fill='none' x1='14.98' y1='11.43' x2='22.37' y2='11.43' />
        <circle fill='currentColor' cx='10.52' cy='18.56' r='1' />
        <circle fill='currentColor' cx='10.52' cy='11.43' r='1' />
        <line stroke='currentColor' strokeLinejoin='round' fill='none' x1='14.98' y1='4.3' x2='22.37' y2='4.3' />
        <circle fill='currentColor' cx='10.52' cy='4.3' r='1' />
        <line stroke='currentColor' strokeLinejoin='round' fill='none' x1='3.89' y1='12.43' x2='3.89' y2='20.13' />
        <polyline stroke='currentColor' strokeLinejoin='round' fill='none' points='5.59 18.37 3.83 20.13 2.07 18.37' />
      </svg>
    </AnimatedIcon>
  )
}

export default MoveThoughtDownIcon
