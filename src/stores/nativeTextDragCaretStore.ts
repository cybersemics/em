import reactMinistore from './react-ministore'

/** The position of the drop caret, in viewport coordinates, while selected text is dragged natively on Android, or null when no drop point is targeted. Set by the native text drag handlers in initEvents and rendered by NativeTextDragCaret. See #4225. */
const nativeTextDragCaretStore = reactMinistore<{ x: number; y: number; height: number } | null>(null)

export default nativeTextDragCaretStore
