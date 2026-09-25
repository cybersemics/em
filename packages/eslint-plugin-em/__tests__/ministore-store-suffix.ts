import { RuleTester } from 'eslint'
import plugin from '../index.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
})

ruleTester.run('ministore-store-suffix', plugin.rules['ministore-store-suffix'], {
  valid: [
    {
      code: 'const alertStore = reactMinistore(null)\nexport default alertStore',
      filename: '/repo/src/stores/alertStore.ts',
    },
    {
      code: 'export const offlineStatusStore = reactMinistore("preconnecting")\nexport default offlineStatusStore',
      filename: '/repo/src/stores/offlineStatusStore.ts',
    },
    {
      code: 'const touchStore = ministore({ touching: false })\nexport default touchStore',
      filename: '/repo/src/stores/touchStore.ts',
    },
    {
      code: 'const derivedStore = ministore.compose(a => a, [aStore])\nconst reactDerivedStore = reactMinistore.compose(a => a, [aStore])',
      filename: '/repo/src/util/derived.ts',
    },
    {
      // a bare local `store` wrapped before export
      code: 'const store = reactMinistore(false)\nconst distractionFreeTypingStore = { ...store }\nexport default distractionFreeTypingStore',
      filename: '/repo/src/stores/distractionFreeTypingStore.ts',
    },
    {
      // a module outside src/stores that uses a ministore but default-exports something else
      code: 'const favoritesPulledStore = ministore(false)\nconst pullQueueMiddleware = () => {}\nexport default pullQueueMiddleware',
      filename: '/repo/src/redux-middleware/pullQueue.ts',
    },
    {
      // a function whose name happens to end in Store is not a ministore outside src/stores
      code: 'const initStore = () => {}\nexport default initStore',
      filename: '/repo/src/test-helpers/initStore.ts',
    },
    {
      code: 'const a = ministore(1)',
      filename: '/repo/src/util/__tests__/ministore.ts',
    },
    {
      code: 'const storeModel = model()\nexport default storeModel',
      filename: '/repo/src/stores/storageModel.ts',
    },
  ],
  invalid: [
    {
      code: 'const generatedEmoji = ministore({ entries: {} })',
      filename: '/repo/src/stores/generatedEmojiStore.ts',
      errors: [{ messageId: 'variableSuffix' }],
    },
    {
      code: 'export const alert = reactMinistore(null)',
      filename: '/repo/src/components/Alert.tsx',
      errors: [{ messageId: 'variableSuffix' }],
    },
    {
      code: 'const composite = ministore.compose(a => a, [aStore])',
      filename: '/repo/src/util/derived.ts',
      errors: [{ messageId: 'variableSuffix' }],
    },
    {
      code: 'const alertStore = reactMinistore(null)\nexport default alertStore',
      filename: '/repo/src/stores/alert.ts',
      errors: [{ messageId: 'fileName' }],
    },
    {
      code: 'const store = reactMinistore(false)\nconst distractionFreeTypingStore = { ...store }\nexport default distractionFreeTypingStore',
      filename: '/repo/src/stores/distractionFreeTyping.ts',
      errors: [{ messageId: 'fileName' }],
    },
    {
      code: 'const multitouchStore = ministore(0)\nexport default multitouchStore',
      filename: '/repo/src/util/multitouch.ts',
      errors: [{ messageId: 'fileName' }],
    },
  ],
})
