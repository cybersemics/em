import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/26-collaps_2.json'

/** Uncategorize Icon with Conditional Lottie Animation. */
const UncategorizeIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: `translate(1%, 0)` }}
      >
        <rect width='24' height='24' fill='none' />
        <line x1='12.63' y1='7.74' x2='13.38' y2='7.74' stroke='currentColor' strokeLinejoin='round' fill='none' />
        <path
          d='M14.63,7.74h.8a.79.79,0,0,1,.79.79v7.56a.79.79,0,0,1-.79.79H7.87a.79.79,0,0,1-.79-.79V14.67'
          stroke='currentColor'
          strokeLinejoin='round'
          fill='none'
          strokeDasharray='1.45 1.26'
        />
        <line x1='7.08' y1='14.04' x2='7.08' y2='13.29' stroke='currentColor' strokeLinejoin='round' fill='none' />
        <rect
          x='2.14'
          y='2.8'
          width='10.31'
          height='10.31'
          rx='3.64'
          stroke='currentColor'
          strokeLinejoin='round'
          fill='none'
        />
        <path
          d='M16.22,11.75h2.17A2.57,2.57,0,0,1,21,14.33v4.72a2.58,2.58,0,0,1-2.58,2.59H13.67a2.59,2.59,0,0,1-2.59-2.59V16.88'
          stroke='currentColor'
          strokeLinejoin='round'
          fill='none'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default UncategorizeIcon
