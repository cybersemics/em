import type { BootstrapConfig, BootstrapConfigOverrides } from '../@types'

const initialEm = window.em

beforeEach(() => {
  Reflect.deleteProperty(window, 'em')
  vi.resetModules()
})

afterEach(() => {
  window.em = initialEm
  vi.resetModules()
})

it('uses the persistent single-tab configuration by default', async () => {
  const { default: bootstrapConfig } = await import('../bootstrapConfig')

  expect(bootstrapConfig.treecrdt).toEqual({ tabPolicy: 'single' })
})

it('uses TreeCRDT configuration injected before module evaluation', async () => {
  const treecrdt: BootstrapConfig['treecrdt'] = {
    client: {
      storage: 'memory',
      runtime: 'direct',
      docId: 'test-doc',
    },
    tabPolicy: 'multiple',
  }
  window.em = {
    ...((window.em || {}) as BootstrapConfigOverrides),
    treecrdt,
  }

  const { default: bootstrapConfig } = await import('../bootstrapConfig')

  expect(bootstrapConfig.treecrdt).toBe(treecrdt)
})
