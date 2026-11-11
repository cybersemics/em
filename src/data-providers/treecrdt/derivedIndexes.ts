import type { MaterializationEvent } from '@treecrdt/interface/engine'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import { clearAttributeChildren, refreshAttributeChildrenFromChanges } from './attributeChildren'
import createLexemeIndex, { payloadKeys } from './lexemes'

/** Bump when an index is added or changes, so databases indexed by an older version are rebuilt once. */
const INDEX_VERSION = 2

/**
 * Keeps em's derived SQLite indexes (attribute children and lexeme memberships) in step with one TreeCRDT client.
 *
 * TreeCRDT delivers every change in order and remembers how far the indexes got, so a gap such as startup or a
 * failed update is caught up without rebuilding. A new INDEX_VERSION clears the indexes and reads every node. Each
 * event is passed on with the lexeme keys it affected.
 */
const createDerivedIndexes = async (
  client: TreecrdtClient,
  onIndexed: (event: MaterializationEvent, keys: string[]) => void,
) => {
  const lexemes = await createLexemeIndex(client)
  const subscription = await client.onMaterializedDurable(
    'em-derived-indexes',
    async event => {
      try {
        await refreshAttributeChildrenFromChanges(client, event.changes)
        onIndexed(event, await lexemes.applyChanges(event.changes))
      } catch (err) {
        // Publication still needs this event's thoughts; the redelivery reports the memberships it missed.
        onIndexed(event, payloadKeys(event.changes))
        throw err
      }
    },
    {
      version: INDEX_VERSION,
      reset: async () => {
        await lexemes.clear()
        await clearAttributeChildren(client)
      },
      onError: err => console.error('TreeCRDT derived indexing failed', err),
    },
  )

  /** Resolves once every change materialized so far is indexed. A failed update is logged and retried, not thrown. */
  const indexed = () => subscription.settled().catch(err => console.error('TreeCRDT derived indexing failed', err))

  return { lexemes, indexed, close: subscription.close }
}

export default createDerivedIndexes
