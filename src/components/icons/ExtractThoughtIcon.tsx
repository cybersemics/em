import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/28-extract_2.json'

/** Extract Thought Icon with Conditional Lottie Animation. */
const ExtractThoughtIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(0, 3%) scale(0.98, 0.98)' }}
      >
        <rect width='24' height='24' fill='none' />
        <ellipse cx='11.97' cy='4.45' rx='8.8' ry='2.55' stroke='currentColor' strokeLinejoin='round' fill='none' />
        <polyline
          points='3.5 5.13 10.14 15.46 10.14 22.1 13.86 19.51 13.86 15.39 20.62 4.92'
          stroke='currentColor'
          strokeMiterlimit='10'
          fill='none'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default ExtractThoughtIcon
