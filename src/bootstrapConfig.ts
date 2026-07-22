import type { TreecrdtRuntimeConfig } from './data-providers/treecrdt/runtime'

/** Application configuration resolved before runtime modules are evaluated. */
export type BootstrapConfig = Readonly<{
  treecrdt: TreecrdtRuntimeConfig
}>

type PreloadedBootstrapConfig = Partial<BootstrapConfig>

declare global {
  interface Window {
    /**
     * Optional configuration supplied before the application bundle evaluates.
     * Read once during module initialization; runtime APIs are exposed later on window.em.
     */
    emConfig?: PreloadedBootstrapConfig
  }
}

const defaultTreecrdtConfig: TreecrdtRuntimeConfig = { tabPolicy: 'single' }

const bootstrapConfig: BootstrapConfig = {
  treecrdt:
    typeof window === 'undefined' ? defaultTreecrdtConfig : (window.emConfig?.treecrdt ?? defaultTreecrdtConfig),
}

export default bootstrapConfig
