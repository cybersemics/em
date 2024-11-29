import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/22-trash_3.json'

/** Archive Icon with Conditional Lottie Animation. */
const ArchiveIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%' }}
      >
        <rect width='24' height='24' fill='none' />
        <path
          d='M4.66,6.11H19.34l-.9,14a2,2,0,0,1-2,1.91H7.59a2,2,0,0,1-2-1.91Z'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <line
          x1='2.95'
          y1='6.11'
          x2='21.05'
          y2='6.11'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M7.17,6.11V3.47a1.07,1.07,0,0,1,1.12-1h7.42a1.07,1.07,0,0,1,1.11,1V6.11'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <line
          x1='9.67'
          y1='11.01'
          x2='9.67'
          y2='17.14'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <line
          x1='14.14'
          y1='11.01'
          x2='14.14'
          y2='17.14'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default ArchiveIcon
