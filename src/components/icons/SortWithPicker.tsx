import { useSelector } from 'react-redux'
import IconType from '../../@types/IconType'
import SortPicker from '../SortPicker'
import SortIcon from './Sort'

/** Sort Icon Component with popup Picker. */
const SortWithPicker = ({ size = 18, style, cssRaw }: IconType) => {
  const showSortPicker = useSelector(state => state.showSortPicker)

  return (
    <div>
      <SortIcon size={size} style={style} cssRaw={cssRaw} animated={showSortPicker} />
      <SortPicker size={size} />
    </div>
  )
}

export default SortWithPicker
