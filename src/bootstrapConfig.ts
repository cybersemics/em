import type { BootstrapConfig, BootstrapConfigOverrides } from './@types'
import type { TreecrdtRuntimeConfig } from './data-providers/treecrdt/runtime'

const defaultTreecrdtConfig: TreecrdtRuntimeConfig = { tabPolicy: 'single' }
const bootstrapOverrides =
  typeof window === 'undefined' ? undefined : (window.em as BootstrapConfigOverrides | undefined)

const bootstrapConfig: BootstrapConfig = {
  treecrdt: bootstrapOverrides?.treecrdt ?? defaultTreecrdtConfig,
}

export default bootstrapConfig
