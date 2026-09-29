import reactMinistore from './react-ministore'

/** A store that tracks the storage the TreeCRDT client actually opened, which is null until initialization resolves it. The client falls back to in-memory storage when persistent storage is unavailable, so a value of `memory` means thoughts will not survive a reload. */
const storageStatusStore = reactMinistore<string | null>(null)

export default storageStatusStore
