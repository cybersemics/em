type FauxCaretType =
  | 'none'
  | 'thoughtStart'
  | 'thoughtEnd'
  | 'noteStart'
  | 'noteEnd'
  /**
   * When text within an Editable text node is selected, the faux caret needs to move to the position where
   * the selection occurred. This differs from what happens when an element node is selected through the use
   * of commands (cursor down, undo/redo, etc.) where another faux caret is shown/hidden in a static position.
   **/
  | 'positioned'

export default FauxCaretType
