import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/14-italic_4.json'

/** Italic Text Icon with Conditional Lottie Animation. */
const ItalicTextIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{
          ...style,
          width: '100%',
          height: '100%',
          transform: `translate(-2px, 0) scale(1.04, 1.04)`,
        }}
      >
        <rect width='24' height='24' fill='none' />
        <path d='M9.63,2.88h9.24' fill='none' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M5.13,20.88h9.24' fill='none' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M14.25,2.88l-4.5,18' fill='none' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
      </svg>
    </AnimatedIcon>
  )
}

export default ItalicTextIcon
