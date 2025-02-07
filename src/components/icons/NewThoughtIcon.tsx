import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/01-new-thought-new_2.json'

/** New Thought Icon with Conditional Lottie Animation. */
const NewThoughtIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        style={{ ...style, width: '100%', height: '100%', transform: `scale(1.05, 1.05)` }}
        fill='none'
      >
        <g id='Layer_2' data-name='Layer 2'>
          <g id='Layer_3' data-name='Layer 3'>
            <g id='_01-new-thought' data-name='01-new-thought'>
              <rect width='24' height='24' fill='none' />
              <line x1='22.3' y1='12' x2='11.66' y2='12' stroke='currentColor' strokeLinejoin='round' />
              <line x1='5.79' y1='9' x2='5.79' y2='15' stroke='currentColor' strokeLinecap='round' />
              <line x1='2.79' y1='12' x2='8.79' y2='12' stroke='currentColor' strokeLinecap='round' />
            </g>
          </g>
        </g>
      </svg>
    </AnimatedIcon>
  )
}

export default NewThoughtIcon
