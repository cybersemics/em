import path from 'node:path'

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
        const ministoreIdentifiers = new Set()

        /**
         * Detects whether an import path points to src/stores.
         *
         * @param importPath
         */
        const isMinistoreImport = importPath => {
          if (typeof importPath !== 'string') return false

          const normalizedImportPath = importPath.replaceAll('\\', '/')
          if (normalizedImportPath.includes('/src/stores/')) return true

          const isRelativePath = normalizedImportPath.startsWith('.')
          if (!isRelativePath) return false

          const normalizedResolvedPath = path.resolve(path.dirname(filename), normalizedImportPath).replaceAll('\\', '/')
          return normalizedResolvedPath.includes('/src/stores/')
        }

        return {
          ImportDeclaration(node) {
            if (!isMinistoreImport(node.source.value)) return

            node.specifiers.forEach(specifier => {
              ministoreIdentifiers.add(specifier.local.name)
            })
          },
          CallExpression(node) {
            if (node.callee.type !== 'MemberExpression') return

            const { object, property } = node.callee
            if (object.type !== 'Identifier' || !ministoreIdentifiers.has(object.name)) return
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
