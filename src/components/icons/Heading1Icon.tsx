import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/18-heading-one.json'

/** Heading1 Icon with Conditional Lottie Animation. */
const Heading1Icon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(1%, -2%) scale(1.07, 1.07)' }}
      >
        <rect width='24' height='24' fill='none' />
        <path d='M3.61,18.18V6.72H5.13v4.71h6V6.72H12.6V18.18H11.08v-5.4H5.13v5.4Z' fill={fill || 'currentColor'} />
        <path
          d='M19.85,18.18H18.44v-9a7.78,7.78,0,0,1-1.33,1,9.39,9.39,0,0,1-1.48.72V9.55a8.51,8.51,0,0,0,2.06-1.34,5.46,5.46,0,0,0,1.25-1.53h.91Z'
          fill={fill || 'currentColor'}
        />
      </svg>
    </AnimatedIcon>
  )
}

export default Heading1Icon
