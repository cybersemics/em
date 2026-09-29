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
    'ministore-store-suffix': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            'Require ministores to be named with a Store suffix, and a module that default-exports a ministore to be named after it.',
        },
        schema: [],
        messages: {
          variableSuffix: "Ministore '{{name}}' must be named with a Store suffix, e.g. '{{name}}Store'.",
          fileName: "A module that default-exports the ministore '{{name}}' must be named '{{name}}.{{ext}}'.",
        },
      },
      /**
       * Reports ministores whose variable name lacks the Store suffix, and store modules whose file name does not match their default-exported store.
       *
       * @param context
       */
      create(context) {
        const filename = context.filename.replaceAll('\\', '/')
        if (filename.includes('/__tests__/')) return {}

        const isStoresFile = filename.includes('/src/stores/')
        const basename = path.basename(filename)
        const ext = path.extname(basename).slice(1)
        const moduleName = path.basename(basename, path.extname(basename))

        const ministoreFactories = new Set(['ministore', 'reactMinistore'])
        /** Names of the variables in this module that are bound to a ministore. */
        const ministoreVariables = new Set()

        /**
         * Detects ministore(...), reactMinistore(...), and their .compose(...) calls.
         *
         * @param node
         */
        const isMinistoreCall = node => {
          if (!node || node.type !== 'CallExpression') return false
          const { callee } = node
          if (callee.type === 'Identifier') return ministoreFactories.has(callee.name)
          return (
            callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            ministoreFactories.has(callee.object.name) &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'compose'
          )
        }

        return {
          VariableDeclarator(node) {
            if (node.id.type !== 'Identifier' || !isMinistoreCall(node.init)) return
            const { name } = node.id
            ministoreVariables.add(name)
            // A bare `store` is allowed for a local that is wrapped or enhanced before it is exported.
            if (name === 'store' || name.endsWith('Store')) return
            context.report({ node: node.id, messageId: 'variableSuffix', data: { name } })
          },
          'Program:exit'(program) {
            const exportDefault = program.body.find(node => node.type === 'ExportDefaultDeclaration')
            if (!exportDefault || exportDefault.declaration.type !== 'Identifier') return
            const { name } = exportDefault.declaration
            const isStore = name.endsWith('Store') && (ministoreVariables.has(name) || isStoresFile)
            if (!isStore || name === moduleName) return
            context.report({ node: exportDefault.declaration, messageId: 'fileName', data: { name, ext } })
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
