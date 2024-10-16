import { defineRecipe } from '@pandacss/dev'

const childRecipe = defineRecipe({
  className: 'child',
  base: {
    _android: {
      '@media (max-width: 500px)': {
        position: 'relative',
        marginLeft: '-100px',
        padding: '1px 0 0.2px 100px',
      },
      '@media (min-width: 560px) and (max-width: 1024px)': {
        position:
          'relative' /* So that .thought can be sized at 100% and .thought .bullet-cursor-overlay bullet can be positioned correctly */,
        marginLeft: '-100px' /* must use margin-left not left so that content wrapping is not affected
        margin-top: 0.501em; /* Match editable padding */,
        padding: '1px 0 0.2px 100px',
      },
    },
  },
})

export default childRecipe
