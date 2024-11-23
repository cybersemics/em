import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/02-new-subthought_2.json'

/** New Subthought Icon with Conditional Lottie Animation. */
const NewSubthoughtIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        style={{ ...style, width: '100%', height: '100%', transform: `scale(1.02, 1.02)` }}
        fill='none'
      >
        <g id='Layer_2' data-name='Layer 2'>
          <g id='Layer_3' data-name='Layer 3'>
            <g id='_02-new-subthought' data-name='02-new-subthought'>
              <rect width='24' height='24' fill='none' />
              <line x1='17.3' y1='7.91' x2='7.2' y2='7.91' stroke='currentColor' strokeLinejoin='round' />
              <circle cx='2.55' cy='7.91' r='1.25' fill='currentColor' />
              <line x1='22.77' y1='15.35' x2='14.66' y2='15.35' stroke='currentColor' strokeLinejoin='round' />
              <line x1='9.2' y1='13.35' x2='9.2' y2='17.35' stroke='currentColor' strokeLinecap='round' />
              <line x1='7.2' y1='15.35' x2='11.2' y2='15.35' stroke='currentColor' strokeLinecap='round' />
            </g>
          </g>
        </g>
      </svg>
    </AnimatedIcon>
  )
}

export default NewSubthoughtIcon
