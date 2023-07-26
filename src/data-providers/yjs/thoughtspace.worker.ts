// declare const self: DedicatedWorkerGlobalScope;
import { expose } from 'comlink'

// eslint-disable-next-line export-default-identifier/export-default-identifier
export default {} as typeof Worker & { new (): Worker }

// Define API
export const api = {
  init: (name: string): string => {
    return `${name} initialized`
  },
}

// Expose API
expose(api)
