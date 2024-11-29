import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/04-new-subthought-next_2.json'

/** New Subthought Next Icon with Conditional Lottie Animation. */
const NewSubthoughtNextIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(3%, 0) scale(1.01, 1.01)' }}
      >
        <rect width='24' height='24' fill='none' />
        <line x1='1.47' y1='3.56' x2='17.03' y2='3.56' stroke='currentColor' strokeLinejoin='round' fill='none' />
        <circle cx='9.18' cy='11' r='1.25' fill='currentColor' />
        <line x1='22.28' y1='11' x2='13.83' y2='11' stroke='currentColor' strokeLinejoin='round' fill='none' />
        <line x1='18.05' y1='18.44' x2='8.92' y2='18.44' stroke='currentColor' strokeLinejoin='round' fill='none' />
        <line x1='3.47' y1='20.44' x2='3.47' y2='16.44' stroke='currentColor' strokeLinecap='round' fill='none' />
        <line x1='1.47' y1='18.44' x2='5.47' y2='18.44' stroke='currentColor' strokeLinecap='round' fill='none' />
      </svg>
    </AnimatedIcon>
  )
}

export default NewSubthoughtNextIcon
