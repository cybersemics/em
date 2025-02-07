import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/32-prose-view_2.json'

/** Prose View Icon with Conditional Lottie Animation. */
const ProseViewIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(1%, 0) scale(0.97, 0.97)' }}
      >
        <rect fill='none' width='24' height='24' />
        <rect
          stroke={fill || 'currentColor'}
          strokeLinecap='round'
          strokeLinejoin='round'
          fill='none'
          x='3.54'
          y='1.83'
          width='16.48'
          height='20.2'
          rx='2.11'
        />
        <line
          stroke={fill || 'currentColor'}
          strokeLinecap='round'
          strokeLinejoin='round'
          fill='none'
          x1='16.77'
          y1='5.53'
          x2='11.64'
          y2='5.53'
        />
        <line
          stroke={fill || 'currentColor'}
          strokeLinecap='round'
          strokeLinejoin='round'
          fill='none'
          x1='16.77'
          y1='8.92'
          x2='6.86'
          y2='8.92'
        />
        <line
          stroke={fill || 'currentColor'}
          strokeLinecap='round'
          strokeLinejoin='round'
          fill='none'
          x1='16.77'
          y1='12.3'
          x2='6.86'
          y2='12.3'
        />
        <line
          stroke={fill || 'currentColor'}
          strokeLinecap='round'
          strokeLinejoin='round'
          fill='none'
          x1='16.77'
          y1='15.69'
          x2='11.64'
          y2='15.69'
        />
        <line
          stroke={fill || 'currentColor'}
          strokeLinecap='round'
          strokeLinejoin='round'
          fill='none'
          x1='16.77'
          y1='19.08'
          x2='6.86'
          y2='19.08'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default ProseViewIcon
