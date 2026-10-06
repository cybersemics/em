import { css } from '../../styled-system/css'
import nativeTextDragCaretStore from '../stores/nativeTextDragCaretStore'

/** The drop caret of a native text drag in the Android app. It replaces the WebView's own drop caret, which is drawn under the finger where it cannot be seen, with one drawn above it. See the native text drag handlers in initEvents. */
const NativeTextDragCaret = () => {
  const caret = nativeTextDragCaretStore.useState()
  if (!caret) return null
  return (
    <div
      className={css({
        position: 'fixed',
        width: '2px',
        backgroundColor: 'blue',
        pointerEvents: 'none',
        zIndex: 'popup',
      })}
      style={{ left: caret.x, top: caret.y, height: caret.height }}
    />
  )
}

export default NativeTextDragCaret
