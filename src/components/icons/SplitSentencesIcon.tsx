import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/23-split-sentences_2.json'

/** Split Sentences Icon with Conditional Lottie Animation. */
const SplitSentencesIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        style={{ ...style, width: '100%', height: '100%', transform: `scale(0.98, 0.98)` }}
        fill='none'
      >
        <g id='Layer_2' data-name='Layer 2'>
          <g id='Layer_3' data-name='Layer 3'>
            <g id='23-split-sentences' data-name='23-split-sentences'>
              <rect width='24' height='24' fill='none' />
              <line
                x1='11.77'
                y1='12.05'
                x2='20.76'
                y2='21.04'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <polyline
                points='21.41 16.64 21.41 21.7 16.7 21.7'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <line
                x1='11.77'
                y1='12.04'
                x2='20.76'
                y2='3.05'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <polyline
                points='21.41 7.45 21.41 2.39 16.7 2.39'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <line
                x1='11.77'
                y1='12.05'
                x2='2.59'
                y2='12.05'
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

export default SplitSentencesIcon
