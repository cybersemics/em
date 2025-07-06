import { defineRecipe } from '@pandacss/dev'

const dropHoverRecipe = defineRecipe({
  className: 'drop-hover',
  description: 'the bar that displays on hover when dragging thoughts',
  base: {
    position: 'absolute',
    // width: 'calc(100% - 2em)',
    height: '3px',
    borderRadius: '99px',
    zIndex: 'stack',
  },
  variants: {
    insideDivider: {
      true: {
        marginLeft: '6px',
      },
    },
    insideDropEnd: {
      /* Last drop-end in Subthoughts */
      true: {
        marginLeft: 'calc(0.6em - 13px)',
        // width: '100%',
      },
    },
  },
})

export default dropHoverRecipe
