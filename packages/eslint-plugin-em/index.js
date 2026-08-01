import path from 'node:path'

/** @type {import('eslint').ESLint.Plugin} */
const plugin = {
  rules: {
    'no-direct-durations-config-import': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow direct imports of durations.config. Use the durations utility (util/durations) instead.',
        },
        schema: [],
        messages: {
          noDirectDurationsConfigImport:
            "Do not import durations.config directly. Use the durations utility (import durations from '../util/durations') instead.",
        },
      },
      /**
       * Reports direct imports of durations.config from files other than the durations util or test files.
       *
       * @param context
       */
      create(context) {
        const filename = context.filename.replaceAll('\\', '/')
        const isDurationsUtil = filename.endsWith('/util/durations.ts')
        const isTestFile = filename.includes('/__tests__/')
        const isPandaConfig = filename.endsWith('/panda.config.ts')
        if (isDurationsUtil || isTestFile || isPandaConfig) return {}

        return {
          ImportDeclaration(node) {
            const importPath = node.source.value
            if (typeof importPath === 'string' && importPath.includes('durations.config')) {
              context.report({ node, messageId: 'noDirectDurationsConfigImport' })
            }
          },
        }
      },
    },
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
        const filename = context.filename
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
