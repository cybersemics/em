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
    'no-precomputed-debug-log-fields': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            'Require debug log fields that do work to be computed inside the fields function passed to debugLog.log: no call or layout read in a fields object, and no variable computed only for the log outside it.',
        },
        schema: [],
        messages: {
          precomputed:
            "'{{names}}' is computed only for debugLog.log, so it is computed even while logging is off. Compute it inside the fields function, or guard it with debugLog.isEnabled().",
          nonStatic:
            'This field value {{reason}}, which is done even while logging is off. Pass the fields as a function instead: debugLog.log(type, () => ({ ... })).',
        },
      },
      /**
       * Reports two ways of computing debug log fields while logging is off. A fields object passed to debugLog.log must be static: a call, a construction, or a read of a property that forces layout or serializes the DOM belongs in a fields function, which is called only while logging is on. And a variable read only inside debugLog.log calls must not be computed above them unless it is guarded by debugLog.isEnabled(), since the fields function defers only what is written inside it. See docs/debug-log.md.
       *
       * @param context
       */
      create(context) {
        const filename = context.filename.replaceAll('\\', '/')
        if (filename.includes('/__tests__/')) return {}

        const { sourceCode } = context

        // Properties that do work when read, without parentheses to show it: layout reads, and DOM serialization.
        const expensiveProperties = new Set([
          'clientHeight',
          'clientLeft',
          'clientTop',
          'clientWidth',
          'innerHeight',
          'innerHTML',
          'innerText',
          'innerWidth',
          'offsetHeight',
          'offsetLeft',
          'offsetParent',
          'offsetTop',
          'offsetWidth',
          'outerHTML',
          'outerText',
          'pageXOffset',
          'pageYOffset',
          'scrollHeight',
          'scrollLeft',
          'scrollTop',
          'scrollWidth',
          'scrollX',
          'scrollY',
          'textContent',
        ])

        /**
         * Returns the first node in an expression that does work when evaluated, with the reason, or null if the expression only reads variables, properties and literals.
         *
         * @param node
         */
        const findWork = node => {
          if (!node || typeof node.type !== 'string') return null
          if (node.type === 'CallExpression') return { node, reason: 'calls a function' }
          if (node.type === 'NewExpression') return { node, reason: 'constructs an object' }
          if (node.type === 'TaggedTemplateExpression') return { node, reason: 'calls a template tag' }
          if (node.type === 'AwaitExpression') return { node, reason: 'awaits a promise' }
          if (
            node.type === 'MemberExpression' &&
            !node.computed &&
            node.property.type === 'Identifier' &&
            expensiveProperties.has(node.property.name)
          ) {
            return { node, reason: `reads ${node.property.name}, which forces layout or serializes the DOM` }
          }
          // a function defined in a field is not called by defining it
          if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') return null
          for (const key of sourceCode.visitorKeys[node.type] ?? []) {
            const child = node[key]
            const children = Array.isArray(child) ? child : [child]
            for (const grandchild of children) {
              const work = findWork(grandchild)
              if (work) return work
            }
          }
          return null
        }

        /**
         * Whether a node is a call to debugLog.<method>.
         *
         * @param node
         * @param method
         */
        const isDebugLogCall = (node, method) =>
          node?.type === 'CallExpression' &&
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'debugLog' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === method

        /**
         * Resolves an identifier to its variable by walking up from the scope it appears in.
         *
         * @param identifier
         */
        const resolve = identifier => {
          let scope = sourceCode.getScope(identifier)
          while (scope) {
            const variable = scope.set.get(identifier.name)
            if (variable) return variable
            scope = scope.upper
          }
          return null
        }

        /**
         * Whether an expression is true only while logging is enabled: debugLog.isEnabled(), a const bound to it, or a conjunction that includes either.
         *
         * @param node
         */
        const isGuard = node => {
          if (!node) return false
          if (isDebugLogCall(node, 'isEnabled')) return true
          if (node.type === 'LogicalExpression' && node.operator === '&&') return isGuard(node.left) || isGuard(node.right)
          if (node.type === 'Identifier') {
            const def = resolve(node)?.defs[0]
            return def?.node.type === 'VariableDeclarator' && def.parent.kind === 'const' && isGuard(def.node.init)
          }
          return false
        }

        /**
         * Whether a statement exits early when logging is disabled, e.g. `if (!debugLog.isEnabled()) return`.
         *
         * @param statement
         */
        const isEarlyExit = statement => {
          if (statement.type !== 'IfStatement' || statement.alternate) return false
          const { test, consequent } = statement
          if (test.type !== 'UnaryExpression' || test.operator !== '!' || !isGuard(test.argument)) return false
          const exit = consequent.type === 'BlockStatement' && consequent.body.length === 1 ? consequent.body[0] : consequent
          return exit.type === 'ReturnStatement' || exit.type === 'ThrowStatement'
        }

        /**
         * Whether a node only runs while logging is enabled: it sits in the consequent of a guard, or after an early exit.
         *
         * @param node
         */
        const isGuarded = node => {
          let child = node
          let parent = node.parent
          while (parent) {
            if (parent.type === 'IfStatement' && child === parent.consequent && isGuard(parent.test)) return true
            if (parent.type === 'ConditionalExpression' && child === parent.consequent && isGuard(parent.test)) return true
            if (parent.type === 'LogicalExpression' && parent.operator === '&&' && child === parent.right && isGuard(parent.left)) return true
            if (parent.type === 'BlockStatement' || parent.type === 'Program') {
              const index = parent.body.indexOf(child)
              if (parent.body.slice(0, index).some(isEarlyExit)) return true
            }
            // a guard outside the function the node is in does not mean the function only runs while it holds
            if (
              parent.type === 'FunctionDeclaration' ||
              parent.type === 'FunctionExpression' ||
              parent.type === 'ArrowFunctionExpression'
            ) {
              return false
            }
            child = parent
            parent = parent.parent
          }
          return false
        }

        /**
         * Whether a node sits inside the arguments of a debugLog.log call.
         *
         * @param node
         */
        const isInDebugLogCall = node => {
          let child = node
          let parent = node.parent
          while (parent) {
            if (isDebugLogCall(parent, 'log') && parent.arguments.includes(child)) return true
            child = parent
            parent = parent.parent
          }
          return false
        }

        return {
          CallExpression(node) {
            if (!isDebugLogCall(node, 'log')) return
            const fields = node.arguments[1]
            if (!fields || fields.type === 'ArrowFunctionExpression' || fields.type === 'FunctionExpression') return
            const work = findWork(fields)
            if (work) context.report({ node: work.node, messageId: 'nonStatic', data: { reason: work.reason } })
          },
          VariableDeclarator(node) {
            if (!node.init) return
            // defining a function computes nothing until it is called
            if (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression') return
            // declared inside the fields function, where it is computed only while logging is on
            if (isInDebugLogCall(node)) return
            // a loop variable is not computed for the log
            if (node.parent.parent.type === 'ForOfStatement' || node.parent.parent.type === 'ForInStatement') return

            const variables = sourceCode.getDeclaredVariables(node)
            const onlyLogged = variables.every(variable => {
              const others = variable.references.filter(reference => !reference.init)
              // a variable that is reassigned or never read is outside this rule
              if (others.length === 0 || others.some(reference => reference.isWrite())) return false
              return others.every(reference => isInDebugLogCall(reference.identifier))
            })
            if (!onlyLogged || variables.length === 0) return
            // an initializer that is itself conditional on the guard, e.g. `debugEnabled ? compute() : []`
            const guardedPart =
              node.init.type === 'ConditionalExpression'
                ? node.init.consequent
                : node.init.type === 'LogicalExpression' && node.init.operator === '&&'
                  ? node.init.right
                  : node
            if (isGuarded(guardedPart)) return

            context.report({
              node,
              messageId: 'precomputed',
              data: { names: variables.map(variable => variable.name).join("', '") },
            })
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
