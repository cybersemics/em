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
  /**
   * Rendered on the non-cursor thoughts of a multiselection while they are in the cleared state (clearThought on
   * multiple selected thoughts). Unlike the other faux carets, it is shown on all platforms (not just mobile Safari)
   * and remains statically positioned at the start of the thought, since these thoughts do not hold the real caret.
   **/
  | 'multicursorStart'

export default FauxCaretType
