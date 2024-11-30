import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/21-heading-four.json'

/** Heading4 Icon with Conditional Lottie Animation. */
const Heading4Icon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(5%, -2%) scale(1.07, 1.07)' }}
      >
        <rect width='24' height='24' fill='none' />
        <path d='M2.68,18.18V6.72H4.19v4.71h6V6.72h1.51V18.18H10.15v-5.4h-6v5.4Z' fill='currentColor' />
        <path
          d='M18.12,18.18V15.44h-5V14.15l5.23-7.43h1.15v7.43h1.55v1.29H19.53v2.74Zm0-4V9l-3.58,5.17Z'
          fill='currentColor'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default Heading4Icon
