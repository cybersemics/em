import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/31-parmanently-delete_2.json'

/** Delete Icon with Conditional Lottie Animation. */
const DeleteIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => (
  <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      style={{
        ...style,
        width: '100%',
        height: '100%',
        transform: `translate(1%, 1%)`,
      }}
      fill='none'
    >
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='31-permanently-delete' data-name='31-permanently-delete'>
            <rect width='24' height='24' fill='none' />
            <path
              d='M7.68,22.21A9.29,9.29,0,0,1,4.6,7.93h0c-.43,2-.35,5.49,2.25,6A10.49,10.49,0,0,1,13.19,3.67c-1.94,4.88,2.82,7.24,3,10.7,2.33-.18,4.06-2,3.51-4.29a8,8,0,0,1-4,12.22Z'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
            />
            <path
              d='M13,22.27c1.21-1.59.16-4.5-1.57-5-1.54.38-2.94,3.44-1.63,4.95'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
            />
          </g>
        </g>
      </g>
    </svg>
  </AnimatedIcon>
)

export default DeleteIcon
