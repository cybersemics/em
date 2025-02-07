import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/03-new-subthought-above_2.json'

/** New Subthought Above Icon with Conditional Lottie Animation. */
const NewSubthoughtAboveIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(-2%, 0) scale(1.03, 1.03)' }}
      >
        <rect width='24' height='24' fill='none' />
        <line x1='16.14' y1='5.18' x2='7.05' y2='5.18' stroke='currentColor' strokeLinejoin='round' fill='none' />
        <line x1='22.61' y1='20.07' x2='7.05' y2='20.07' stroke='currentColor' strokeLinejoin='round' fill='none' />
        <circle cx='2.39' cy='5.18' r='1.25' fill='currentColor' />
        <line x1='22.61' y1='12.63' x2='14.5' y2='12.63' stroke='currentColor' strokeLinejoin='round' fill='none' />
        <line x1='9.05' y1='10.62' x2='9.05' y2='14.62' stroke='currentColor' strokeLinecap='round' fill='none' />
        <line x1='7.05' y1='12.62' x2='11.05' y2='12.62' stroke='currentColor' strokeLinecap='round' fill='none' />
      </svg>
    </AnimatedIcon>
  )
}

export default NewSubthoughtAboveIcon
