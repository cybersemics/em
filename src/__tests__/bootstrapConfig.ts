import type { BootstrapConfig } from '../bootstrapConfig'

const initialEmConfig = window.emConfig

beforeEach(() => {
  delete window.emConfig
  vi.resetModules()
})

afterEach(() => {
  window.emConfig = initialEmConfig
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
  window.emConfig = { treecrdt }

  const { default: bootstrapConfig } = await import('../bootstrapConfig')

  expect(bootstrapConfig.treecrdt).toBe(treecrdt)
})
