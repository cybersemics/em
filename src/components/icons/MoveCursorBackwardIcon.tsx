import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/16-move-thought-up.json'

/** MoveCursorBackward Icon with Conditional Lottie Animation. */
const MoveCursorBackwardIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(-1%, 1%) scale(0.97, 0.97)' }}
      >
        <rect width='24' height='24' fill='none' />
        <line x1='15.11' y1='4.88' x2='22.5' y2='4.88' stroke='currentColor' strokeLinejoin='round' fill='none' />
        <line x1='15.11' y1='12' x2='22.5' y2='12' stroke='currentColor' strokeLinejoin='round' fill='none' />
        <circle cx='10.65' cy='4.87' r='1' fill='currentColor' />
        <circle cx='10.65' cy='12' r='1' fill='currentColor' />
        <line x1='15.11' y1='19.13' x2='22.5' y2='19.13' stroke='currentColor' strokeLinejoin='round' fill='none' />
        <circle cx='10.65' cy='19.13' r='1' fill='currentColor' />
        <line x1='4.02' y1='11' x2='4.02' y2='3.3' stroke='currentColor' strokeLinejoin='round' fill='none' />
        <polyline points='5.71 5.06 3.96 3.31 2.2 5.06' stroke='currentColor' strokeLinejoin='round' fill='none' />
      </svg>
    </AnimatedIcon>
  )
}

export default MoveCursorBackwardIcon
