import { RuleTester } from 'eslint'
import plugin from '../index.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
})

const filename = '/repo/src/components/Thing.ts'

ruleTester.run('no-precomputed-debug-log-fields', plugin.rules['no-precomputed-debug-log-fields'], {
  valid: [
    {
      code: "const f = () => { debugLog.log('x', () => ({ rect: el.getBoundingClientRect() })) }",
      filename,
    },
    // used outside the log as well, so it is computed regardless
    {
      code: "const f = () => { const rect = el.getBoundingClientRect(); debugLog.log('x', () => ({ rect })); use(rect) }",
      filename,
    },
    // declared inside the fields function
    {
      code: "const f = () => { debugLog.log('x', () => { const rect = el.getBoundingClientRect(); return { rect } }) }",
      filename,
    },
    // a function definition computes nothing
    {
      code: "const f = () => { const describe = el => el.id; debugLog.log('x', () => ({ id: describe(el) })) }",
      filename,
    },
    {
      code: "const f = () => { if (debugLog.isEnabled()) { const rect = el.getBoundingClientRect(); debugLog.log('x', () => ({ rect })) } }",
      filename,
    },
    {
      code: "const f = () => { if (!debugLog.isEnabled()) return; const rect = el.getBoundingClientRect(); debugLog.log('x', () => ({ rect })) }",
      filename,
    },
    {
      code: "const f = () => { const enabled = debugLog.isEnabled(); const rects = enabled ? els.map(measure) : []; debugLog.log('x', () => ({ rects })) }",
      filename,
    },
    {
      code: "const f = () => { const rect = debugLog.isEnabled() && el.getBoundingClientRect(); debugLog.log('x', () => ({ rect })) }",
      filename,
    },
    // reassigned, so not only computed for the log
    {
      code: "const f = () => { let n = 0; n = n + 1; debugLog.log('x', () => ({ n })) }",
      filename,
    },
    {
      code: "const rect = el.getBoundingClientRect(); debugLog.log('x', () => ({ rect }))",
      filename: '/repo/src/util/__tests__/thing.ts',
    },
  ],
  invalid: [
    {
      code: "const f = () => { const rect = el.getBoundingClientRect(); debugLog.log('x', () => ({ rect })) }",
      filename,
      errors: [{ messageId: 'precomputed', data: { names: 'rect' } }],
    },
    // read by two log calls and nothing else
    {
      code: "const f = () => { const n = items.length; debugLog.log('a', () => ({ n })); debugLog.log('b', () => ({ n })) }",
      filename,
      errors: [{ messageId: 'precomputed' }],
    },
    {
      code: "const f = () => { const { x, y } = el.getBoundingClientRect(); debugLog.log('x', () => ({ x, y })) }",
      filename,
      errors: [{ messageId: 'precomputed', data: { names: "x', 'y" } }],
    },
    // a guard in an outer function does not cover a function defined inside it
    {
      code: "if (debugLog.isEnabled()) { requestAnimationFrame(() => { const rect = el.getBoundingClientRect(); debugLog.log('x', () => ({ rect })) }) }",
      filename,
      errors: [{ messageId: 'precomputed' }],
    },
    // a negated guard is not a guard
    {
      code: "const f = () => { if (!debugLog.isEnabled()) { const rect = el.getBoundingClientRect(); debugLog.log('x', () => ({ rect })) } }",
      filename,
      errors: [{ messageId: 'precomputed' }],
    },
  ],
})
