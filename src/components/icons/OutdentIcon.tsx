import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/05-outdent_2.json'

/** Outdent Icon with Conditional Lottie Animation. */
const OutdentIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        style={{
          ...style,
          width: '100%',
          height: '100%',
          transform: `translate(4%, 0) scale(1.01, 1.01)`,
        }}
        fill='none'
      >
        <g id='Layer_2' data-name='Layer 2'>
          <g id='Layer_3' data-name='Layer 3'>
            <g id='05-outdent' data-name='05-outdent'>
              <rect width='24' height='24' fill='none' />
              <line
                x1='20.8'
                y1='1.89'
                x2='3.2'
                y2='1.89'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <line
                x1='20.8'
                y1='8.55'
                x2='14.68'
                y2='8.55'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <line
                x1='10.01'
                y1='11.88'
                x2='3.2'
                y2='11.88'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <line
                x1='20.8'
                y1='15.21'
                x2='14.68'
                y2='15.21'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <line
                x1='20.8'
                y1='21.87'
                x2='3.2'
                y2='21.87'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <polyline
                points='6.25 8.83 3.2 11.88 6.3 14.99'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </g>
          </g>
        </g>
      </svg>
    </AnimatedIcon>
  )
}

export default OutdentIcon
