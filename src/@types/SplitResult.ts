/*
  Represents the result of a split operation on an Editable.

  In the simple case, left + right === value.
  In the more complex case, beginning and ending tags are regenerated if an element gets split.

  e.g. <b>bold and <i>italic<i></b>.

  Splitting after "and" yields:

  {
    left: '<b>bold and </b>',
    right: '<b><i>italic</i></b>'
 }
*/
interface SplitResult {
  left: string
  right: string
}

export default SplitResult
