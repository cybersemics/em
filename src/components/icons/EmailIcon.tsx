import { useSelector } from 'react-redux'
import themeColors from '../../selectors/themeColors'

/** Email icon. */
const EmailIcon = () => {
  const colors = useSelector(themeColors)
  return (
    <svg
      width='1.1em'
      viewBox='00 20 95 65'
      style={{
        cursor: 'pointer',
        pointerEvents: 'all',
      }}
    >
      <g transform='translate(0,-952.36218)'>
        <path
          d='m 10.000002,973.36216 c -1.6274005,0 -3.0000005,1.37255 -3.0000005,3 l 0,52.00004 c 0,1.6274 1.3726,3 3.0000005,3 l 79.999997,0 c 1.627399,0 3,-1.3726 3,-3 l 0,-52.00004 c 0,-1.62745 -1.372601,-3 -3,-3 l -79.999997,0 z m 4,4 71.999997,0 -35.999998,33.28124 -36,-33.28124 z m -3,2.625 23.093799,21.37504 -23.093799,23.0937 0,-44.46874 z m 77.999997,0 0,44.46874 -23.093797,-23.0937 23.093797,-21.37504 z m -51.968798,24.06254 11.625001,10.7812 a 2.0002,2.0002 0 0 0 2.6876,0 l 11.625,-10.7812 23.312397,23.3125 -72.562397,0 23.3124,-23.3125 z'
          fill={colors.gray50}
        />
      </g>
    </svg>
  )
}

export default EmailIcon
