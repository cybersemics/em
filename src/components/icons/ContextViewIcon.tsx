import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/18-context-view_3.json'

/** Context View Icon with Conditional Lottie Animation. */
const ContextViewIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        style={{ ...style, width: '100%', height: '100%', transform: `scale(0.97, 0.97)` }}
        fill='none'
      >
        <g id='Layer_2' data-name='Layer 2'>
          <g id='Layer_3' data-name='Layer 3'>
            <g id='_18-context-view' data-name='18-context-view'>
              <rect width='24' height='24' fill='none' />
              <path d='M14,4.47a2,2,0,1,0-2,2A2,2,0,0,0,14,4.47Z' fill='none' stroke='currentColor' />
              <path d='M6,4.47a2,2,0,1,0-2,2A2,2,0,0,0,6,4.47Z' fill='none' stroke='currentColor' />
              <path d='M22,4.47a2,2,0,1,0-2,2A2,2,0,0,0,22,4.47Z' fill='none' stroke='currentColor' />
              <path d='M14,20.47a2,2,0,1,0-2,2A2,2,0,0,0,14,20.47Z' fill='none' stroke='currentColor' />
              <path d='M12,18.47v-12' fill='none' stroke='currentColor' />
              <path d='M20,6.47v5a2,2,0,0,1-2,2H6a2,2,0,0,1-2-2v-5' fill='none' stroke='currentColor' />
            </g>
          </g>
        </g>
      </svg>
    </AnimatedIcon>
  )
}

export default ContextViewIcon
