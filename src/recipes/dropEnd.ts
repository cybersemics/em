import { defineRecipe } from '@pandacss/dev'

const dropEndRecipe = defineRecipe({
  className: 'drop-end',
  description: 'the drop target at the end of a context',
  base: {
    position: 'absolute',
    height: '0.5em',
    /* margin to offset bullet width */
    marginLeft: '-1em',
    /* Add additional click area to position the drop target more evenly between siblings (vertically).
     Unfortunately, due to the HTML hierarchy stacking order, multiple drop-ends at the same y position (e.g. after /a/b/c below) will always be obscured by their previous siblings descendants.
     This is still better than nothing.
    */
    marginTop: '-0.5em',
    paddingTop: '0.5em',
    /* must use z-index 0 since deeply nested drop targets come BEFORE other subsequent uncles in the HTML. Otherwise z-index will be ignored and the HTML order will force an incorrect stacking order; later uncles will obscure deeply nested drop targets.

    e.g. The subthught drop target for a would incorrectly obscure that of b and c.

    - a
      - b
        - c

    */
    zIndex: 0,
    width: 'calc(100% - 2em)',
  },
  variants: {},
})

export default dropEndRecipe
