import { isTouch } from '../browser'

/** A faster alternative to onClick or checkbox onChange. Returns onTouchStart or onMouseDown handler depending on if touch is supported. Should not be used with scrolling or drag-and-drop. */
const onTapDown = isTouch
  ? (handler: (e: React.TouchEvent) => void) => ({ onTouchStart: handler })
  : (handler: (e: React.MouseEvent) => void) => ({ onMouseDown: handler })

export default onTapDown
