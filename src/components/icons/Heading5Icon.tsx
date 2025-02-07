import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/22-heading-five.json'

/** Heading5 Icon with Conditional Lottie Animation. */
const Heading5Icon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(1%, -2%) scale(1.07, 1.07)' }}
      >
        <rect width='24' height='24' fill='none' />
        <path d='M3.63,18.18V6.72H5.14v4.71h6V6.72h1.51V18.18H11.1v-5.4h-6v5.4Z' fill='currentColor' />
        <path
          d='M14.56,15.18,16,15.05a2.63,2.63,0,0,0,.76,1.62,2,2,0,0,0,1.44.55A2.25,2.25,0,0,0,20,16.45a2.89,2.89,0,0,0,.71-2,2.63,2.63,0,0,0-.68-1.9,2.37,2.37,0,0,0-1.77-.69,2.44,2.44,0,0,0-1.23.31,2.37,2.37,0,0,0-.86.8l-1.32-.18,1.11-5.88h5.7V8.22H17.05l-.62,3.08a3.74,3.74,0,0,1,2.17-.72,3.44,3.44,0,0,1,2.53,1,3.69,3.69,0,0,1,1,2.68A4.12,4.12,0,0,1,21.25,17a3.62,3.62,0,0,1-3,1.39,3.72,3.72,0,0,1-2.55-.87A3.44,3.44,0,0,1,14.56,15.18Z'
          fill='currentColor'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default Heading5Icon
