import reactMinistore from './react-ministore'

/** Whether em's own text selection menu (Cut, Copy, Paste) is shown over the selection in Mobile Safari. Mobile
 * Safari dismisses its native edit menu when an edit of em's own, such as a letter case change, moves the selected
 * text, and a web page has no way to present that menu again, so em shows its own in its place. Set by
 * restoreEditMenu and cleared by SelectionMenu as soon as the selection changes or the user touches anything else. See
 * docs/cursor-and-caret.md. */
const selectionMenuStore = reactMinistore(false)

export default selectionMenuStore
