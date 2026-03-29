import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/07-pin_3.json'

/** Pin Icon with Conditional Lottie Animation. */
const PinIcon = ({
  fill,
  size = 18,
  style = {},
  cssRaw,
  animated,
  animationComplete,
  active,
}: IconType & { active?: boolean }) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        style={{
          ...style,
          width: '100%',
          height: '100%',
          transform: `translate(4%, 6%) scale(0.98, 0.98)`,
        }}
      >
        <g id='Layer_2' data-name='Layer 2'>
          <g id='Layer_3' data-name='Layer 3'>
            <g id='_07-pin' data-name='07-pin'>
              <rect width='24' height='24' fill='none' />
              <ellipse
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                fill={!animated && active ? style.fill : 'none'}
                cx='17.66'
                cy='6.04'
                rx='2.33'
                ry='4.94'
                transform='translate(0.9 14.26) rotate(-45)'
              />
              <path
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                fill={!animated && active ? style.fill : 'none'}
                d='M14,14a6.58,6.58,0,0,1-1.65,6.57h0A21.55,21.55,0,0,1,3,11.21H3A6.59,6.59,0,0,1,9.66,9.6'
              />
              <line
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                x1='13.82'
                y1='5.45'
                x2='9.65'
                y2='9.62'
              />
              <line
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                x1='18.16'
                y1='9.78'
                x2='13.99'
                y2='13.95'
              />
              <line
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                x1='6.92'
                y1='16.6'
                x2='2.47'
                y2='21.05'
              />
            </g>
          </g>
        </g>
      </svg>
    </AnimatedIcon>
  )
}

export default PinIcon
