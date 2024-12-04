import { useSelector } from 'react-redux'
import IconType from '../../@types/IconType'
import State from '../../@types/State'
import { HOME_PATH } from '../../constants'
import getSortPreference from '../../selectors/getSortPreference'
import head from '../../util/head'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/10-sort_4.json'
import animationDataDesc from './animations/11-sort-descanding_7.json'

/** Cursor Sort Direction. */
const getCursorSortDirection = (state: State) => {
  const cursorId = head(state.cursor || HOME_PATH)
  const sortPref = getSortPreference(state, cursorId)
  if (sortPref.type === 'None') {
    return null
  }

  return sortPref?.direction || null
}

/** Ascending Sort Icon Component with Conditional Lottie Animation. */
const IconAsc = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%' }}
      >
        <rect width='24' height='24' fill='none' />
        <line
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          x1='5.51'
          y1='4.33'
          x2='5.51'
          y2='19.67'
        />
        <polyline
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          points='2.27 16.42 5.51 19.66 8.81 16.36'
        />
        <line
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          x1='12.08'
          y1='4.73'
          x2='15.2'
          y2='4.73'
        />
        <line
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          x1='12.08'
          y1='9.71'
          x2='17.78'
          y2='9.71'
        />
        <line
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          x1='12.08'
          y1='14.69'
          x2='19.48'
          y2='14.69'
        />
        <line
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          x1='12.08'
          y1='19.67'
          x2='21.73'
          y2='19.67'
        />
      </svg>
    </AnimatedIcon>
  )
}

/** Descending Sort Icon Component with Conditional Lottie Animation. */
const IconDesc = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData: animationDataDesc, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%' }}
      >
        <rect width='24' height='24' fill='none' />
        <line
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          x1='5.51'
          y1='19.67'
          x2='5.51'
          y2='4.33'
        />
        <polyline
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          points='2.27 7.57 5.51 4.33 8.81 7.63'
        />
        <line
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          x1='12.08'
          y1='19.26'
          x2='15.2'
          y2='19.26'
        />
        <line
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          x1='12.08'
          y1='14.29'
          x2='17.78'
          y2='14.29'
        />
        <line
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          x1='12.08'
          y1='9.31'
          x2='19.48'
          y2='9.31'
        />
        <line
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          x1='12.08'
          y1='4.33'
          x2='21.73'
          y2='4.33'
        />
      </svg>
    </AnimatedIcon>
  )
}

/** Sort Icon Component with Conditional Lottie Animation. */
const SortIcon = ({ size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  const direction = useSelector(getCursorSortDirection)
  const Component = direction === 'Desc' ? IconDesc : IconAsc
  const isAnimated = direction === 'Desc' ? true : animated
  return <Component {...{ size, style, cssRaw, animated: isAnimated, animationComplete }} />
}

export default SortIcon
