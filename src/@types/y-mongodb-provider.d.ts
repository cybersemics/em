declare module 'y-mongodb-provider' {
  /** MongodbPersistence class. */
  class MongodbPersistence implements YBindablePersistence {
    constructor(
      connectionString: string,
      options?: {
        collectionName?: string
        flushSize?: number
        multipleCollection?: boolean
      },
    )

    clearDocument: (docName: string) => Promise<Uint8Array>
    flushDocument: (docName: string) => Promise<void>
    getDiff: (docName: string, stateVector: Uint8Array) => Promise<Uint8Array>
    getYDoc: (docName: string) => Promise<Y.Doc>
    getMeta: <T = any>(docName: string, key: string) => Promise<T | undefined>
    getStateVector: (docName: string) => Promise<Uint8Array>
    getAllDocNames: (docName: string) => Promise<string[]>
    getAllDocStateVectors: (docName: string) => Promise<{ name: string; clock: number; sv: Uint8Array }[]>
    setMeta: (docName: string, key: string, value: any) => Promise<void>
    storeUpdate: (docName: string, update: Uint8Array) => Promise<unknown>
    delMeta: (docName: string, key: string) => Promise<void>
  }
}
