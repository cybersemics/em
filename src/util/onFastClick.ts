import { isTouch } from '../browser'

/** A faster alternative to onClick or checkbox onChange. Returns onTouchStart or onMouseDown handler depending on if touch is supported. */
const onFastClick = (onClick: (e: React.MouseEvent | React.TouchEvent) => void) =>
  isTouch ? { onTouchStart: onClick } : { onMouseDown: onClick }

export default onFastClick
