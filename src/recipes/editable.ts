import { defineRecipe } from '@pandacss/dev'

const editableRecipe = defineRecipe({
  className: 'editable',
  description: 'editable styles',
  base: {
    /* Add some padding-right for increased click area. */
    /* Add some padding-left otherwise caret is invisible on empty elements. */
    /* Cannot use padding-top on editable, as clicking it causes the selection to go to the beginning. */
    /* Cannot use padding-bottom on editable, as clicking it causes the selection to go to the end. */
    padding: '0 1em 0 0.333em',
    boxSizing: 'border-box',
    // Adjust the space between the bullet and the text with margin-left. When font size is greater than 18px, the space will be increased. When the font size is less than 18th, the space will be decreased.
    // The margin-right must offset margin-left to ensure that urls are not incorrectly ellipsized on smaller font sizes. This is because text-overflow: 'ellipsis' applied to the ThoughtAnnotation does not account for the negative margin of the child.
    margin: '-0.5px calc(18px - 1em) 0 calc(1em - 18px)',
    /* create stacking order to position above thought-annotation so that function background color does not mask thought */
    position: 'relative',
    /* Prevent the selection from being incorrectly set to the beginning of the thought when the top edge is clicked, and the end of the thought when the bottom edge is clicked. Instead, we want the usual behavior of the selection being placed near the click. */

    clipPath: 'inset(0.001px 0 0.1em 0)',
    wordBreak: 'break-word' /* breaks urls; backwards-compatible with regular text unlike break-all */,
    marginTop: {
      /* TODO: Safari only? */
      _mobile: '-2px',
    },
    paddingBottom: { _mobile: '0' },
    /* On Safari, the caret is not lined up with the placeholder text on empty thoughts (due to either negative margin or line-height).
      Add padding-top to shift the caret down.
      This bumps the placeholder text off, so we need to shift the placeholder text up by the same amount.
    */
    '&:empty': {
      paddingTop: { _safari: '0.2em' },
      marginBottom: { _safari: '-0.2em' } /* offset padding-top, otherwise next sibling will be bumped down */,
    },
    '&:empty::before': {
      /* shift placeholder up to offset padding-top */
      top: { _safari: '-0.2em' },
      position: { _safari: 'relative' },
    },
  },
  variants: {
    preventAutoscroll: {
      true: {
        /* See: https://stackoverflow.com/a/60712537/480608 */
        animation: '0.01s 1 preventAutoscroll',
      },
    },
  },
})

export default editableRecipe
