import { defineRecipe } from '@pandacss/dev'

const thoughtRecipe = defineRecipe({
  className: 'thought',
  base: {
    maxWidth: '100%',
    /* do not set font-weight or it will override =heading style. */
    marginTop: '0',
    display: 'inline-block',
    verticalAlign: 'top',
    whiteSpace: 'pre-wrap',
  },
  variants: {
    /** Assign annotation height on single line truncated url. */
    ellipsizedUrl: {
      true: {
        maxWidth: 'calc(100% - 1em)',
      },
    },
    inverse: {
      true: {
        // invert placeholder color if the color is inverted (such as when a background color is applied)
        '[placeholder]:empty::before': { color: { _base: 'var(--placeholder-color, {colors.dimInverse})' } },
      },
    },
    flex: {
      true: {
        display: 'flex',
        flex: 1,
      },
    },
  },
  staticCss: ['*'],
})

export default thoughtRecipe
