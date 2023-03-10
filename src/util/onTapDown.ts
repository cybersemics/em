import { isTouch } from '../browser'

/** A faster alternative to onClick or checkbox onChange. Returns onTouchStart or onMouseDown handler depending on if touch is supported. */
const onTapDown = (handler: (e: React.MouseEvent | React.TouchEvent) => void) =>
  isTouch ? { onTouchStart: handler } : { onMouseDown: handler }

export default onTapDown
