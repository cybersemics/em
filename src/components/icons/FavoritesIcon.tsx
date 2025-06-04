import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/04-favorite_3.json'

/** Favorites Icon with Conditional Lottie Animation. */
const FavoritesIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete, active }: IconType & { active?: boolean }) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(0, 0) scale(0.95, 0.95)' }}
        fill='none'
      >
        <g id='Layer_2' data-name='Layer 2'>
          <g id='Layer_3' data-name='Layer 3'>
            <g id='01-favorites' data-name='01-favorites'>
              <rect width='24' height='24' fill='none' />
              <path
                d='M12.53,2.55l2.85,5.32a.56.56,0,0,0,.42.31l5.95,1.07a.59.59,0,0,1,.32,1l-4.18,4.36a.56.56,0,0,0-.16.49l.82,6a.6.6,0,0,1-.85.62l-5.44-2.64a.59.59,0,0,0-.52,0L6.3,21.71a.6.6,0,0,1-.85-.62l.82-6a.56.56,0,0,0-.16-.49L1.93,10.25a.59.59,0,0,1,.32-1L8.2,8.18a.56.56,0,0,0,.42-.31l2.85-5.32A.6.6,0,0,1,12.53,2.55Z'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                fill={!animated && active ? style.fill : 'none'}
              />
            </g>
          </g>
        </g>
      </svg>
    </AnimatedIcon>
  )
}

export default FavoritesIcon
