import IconType from '../../@types/IconType'
import BulletPicker from '../BulletPicker'
import BulletStyleIcon from './BulletStyleIcon'

/** Bullet Style Icon Component with popup Picker. */
const BulletStyleWithPicker = ({ size = 18, style, className }: IconType) => {
  return (
    <div>
      <BulletStyleIcon size={size} style={style} className={className} />
      <BulletPicker size={size} />
    </div>
  )
}

export default BulletStyleWithPicker
