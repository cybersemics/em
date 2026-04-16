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
      code: 'store.useEffect(() => {})',
      filename: '/repo/src/components/Component.tsx',
    },
  ],
  invalid: [
    {
      code: 'store.subscribe(() => {})',
      filename: '/repo/src/components/Component.tsx',
      errors: [{ messageId: 'noStoreSubscribe' }],
    },
  ],
})
