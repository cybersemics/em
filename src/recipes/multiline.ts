import { defineRecipe } from '@pandacss/dev'

const multilineRecipe = defineRecipe({
  className: 'multiline',
  description: 'multiline styles',
  base: {
    lineHeight: 1.25,
    marginTop: '-0.12em !important',
    paddingBottom: '0.5em !important',
    /* A small amount of margin-bottom may make multiline thoughts feel less crunched. However, this must be prevented or overridden when the thought has a note, otherwise there will be too much space in between the thought and the note. */

    paddingTop: {
      base: '0.33em',
      _safari: '0.3em',
      _mobile: {
        /* Hacky, nonlinear multiline padding-top that works across all font sizes on mobile Safari. Otherwise the thought goes out of alignment with the bullet when it becomes multiline. */
        /* 0.2em works at font size 13 */
        /* 0.24em works at font size 18 */
        /* works without max at font sizes 18–24 */
        _safari: 'calc(max(0.5em, 7.5px) - 5px) !important',
      },
    },
  },
})

export default multilineRecipe
