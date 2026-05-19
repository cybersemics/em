import { RuleTester } from 'eslint'
import plugin from '../index.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
})

ruleTester.run('no-store-subscribe-in-components', plugin.rules['no-store-subscribe-in-components'], {
  valid: [
    {
      code: 'store.subscribe(() => {})',
      filename: '/repo/src/hooks/useThing.ts',
    },
    {
      code: 'otherStore.subscribe(() => {})',
      filename: '/repo/src/components/Component.tsx',
    },
    {
      code: "import utilityStore from '../util/utilityStore'\nutilityStore.subscribe(() => {})",
      filename: '/repo/src/components/Component.tsx',
    },
    {
      code: "import store from '../stores/app'\nstore.useEffect(() => {})",
      filename: '/repo/src/components/Component.tsx',
    },
  ],
  invalid: [
    {
      code: "import store from '../stores/app'\nstore.subscribe(() => {})",
      filename: '/repo/src/components/Component.tsx',
      errors: [{ messageId: 'noStoreSubscribe' }],
    },
    {
      code: "import editingValueStore from '../stores/editingValue'\neditingValueStore.subscribe(() => {})",
      filename: '/repo/src/components/Component.tsx',
      errors: [{ messageId: 'noStoreSubscribe' }],
    },
    {
      code: "import viewportStore from '/repo/src/stores/viewport'\nviewportStore.subscribe(() => {})",
      filename: '/repo/src/components/Component.tsx',
      errors: [{ messageId: 'noStoreSubscribe' }],
    },
  ],
})
