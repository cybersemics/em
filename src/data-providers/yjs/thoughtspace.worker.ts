import { expose } from 'comlink'
import * as thoughtspace from './thoughtspace'

// eslint-disable-next-line export-default-identifier/export-default-identifier
export default {} as typeof Worker & { new (): Worker }

export const api = thoughtspace

expose(api)
