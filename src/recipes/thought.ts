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
    '@media (max-width: 500px)': {
      marginTop: { _android: '-2.1px' },
      marginLeft: { _android: '0.5em' },
    },
    '@media (min-width: 560px) and (max-width: 1024px)': {
      marginTop: { _android: '-0.1px' },
      marginLeft: { _android: '0.5em' },
    },
  },
  variants: {
    /** Assign annotation height on single line truncated url. */
    ellipsizedUrl: {
      true: {
        /**
          .single-line element has display: inline-block property, it affects the height calculation of the .thought div so we need to set the height manually.
         */
        height: 'minThoughtHeight',
        maxWidth: 'calc(100% - 1em)',
      },
    },
    inverse: {
      true: {
        // invert placeholder color if the color is inverted (such as when a background color is applied)
        '[placeholder]:empty::before': { color: { _base: 'rgba(255, 255, 255, 0.5)', _dark: 'rgba(7, 7, 7, 0.5)' } },
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
