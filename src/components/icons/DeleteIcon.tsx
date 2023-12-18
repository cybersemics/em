import { useSelector } from 'react-redux'
import Icon from '../../@types/Icon'
import themeColors from '../../selectors/themeColors'

/** A delete icon. */
const DeleteIcon = ({ fill, size = 18, style }: Icon) => {
  const colors = useSelector(themeColors)
  return (
    <svg className='icon' width={size} height={size} fill={fill || colors.fg} viewBox='50 0 600 600' style={style}>
      <g>
        <path d='m260.91 178.18h25.453v280h-25.453z' />
        <path d='m413.64 178.18h25.453v280h-25.453z' />
        <path d='m579.09 89.09h-114.55l0.003906-38.18c0-20.363-17.816-38.184-38.184-38.184h-152.73c-20.363 0-38.184 17.82-38.184 38.184v38.184l-114.54-0.003906v25.453h38.184l22.91 397.09c0 20.363 17.816 35.637 38.184 35.637h257.09c20.363 0 38.184-15.273 38.184-35.637l22.91-397.09 40.719 0.003906zm-318.18-38.18c0-7.6367 5.0898-12.727 12.727-12.727h152.73c7.6367 0 12.727 5.0898 12.727 12.727v38.184h-178.18zm231.64 458.18c0 7.6367-5.0898 12.727-12.727 12.727h-259.64c-7.6367 0-12.727-5.0898-12.727-12.727l-22.91-394.54h328.36z' />
        <path d='m337.27 178.18h25.453v280h-25.453z' />
      </g>
    </svg>
  )
}

export default DeleteIcon
