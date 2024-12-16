import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/05-new-thought-above_2.json'

/** New Thought Above Icon with Conditional Lottie Animation. */
const NewThoughtAboveIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(0, 1%) scale(1.02, 1.02)' }}
      >
        <rect width='24' height='24' fill='none' />
        <circle cx='3.56' cy='16.88' r='1.25' fill='currentColor' />
        <line x1='21.69' y1='7.27' x2='9.23' y2='7.27' stroke='currentColor' strokeLinejoin='round' fill='none' />
        <line x1='21.69' y1='16.88' x2='9.23' y2='16.88' stroke='currentColor' strokeLinejoin='round' fill='none' />
        <line x1='4.31' y1='9.27' x2='4.31' y2='5.27' stroke='currentColor' strokeLinecap='round' fill='none' />
        <line x1='2.31' y1='7.27' x2='6.31' y2='7.27' stroke='currentColor' strokeLinecap='round' fill='none' />
      </svg>
    </AnimatedIcon>
  )
}

export default NewThoughtAboveIcon
