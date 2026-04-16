/** @type {import('eslint').ESLint.Plugin} */
const plugin = {
  rules: {
    'no-store-subscribe-in-components': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Use store.useEffect() for ministore subscriptions in React components instead of store.subscribe().',
        },
        schema: [],
        messages: {
          noStoreSubscribe:
            "Use store.useEffect() for ministore subscriptions in React components instead of store.subscribe().",
        },
      },
      /**
       * Reports store.subscribe calls from files in src/components.
       *
       * @param context
       */
      create(context) {
        const filename = context.getFilename()
        const isComponentFile = filename.includes('/src/components/')
        if (!isComponentFile) return {}

        return {
          CallExpression(node) {
            if (node.callee.type !== 'MemberExpression') return

            const { object, property } = node.callee
            if (object.type !== 'Identifier' || object.name !== 'store') return
            if (property.type !== 'Identifier' || property.name !== 'subscribe') return

            context.report({
              node,
              messageId: 'noStoreSubscribe',
            })
          },
        }
      },
    },
  },
}

export default plugin
