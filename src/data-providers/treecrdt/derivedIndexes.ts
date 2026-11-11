import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import { clearAttributeChildren, refreshAttributeChildrenFromChanges } from './attributeChildren'

const INDEX_VERSION = 1

/**
 * Keeps em's derived SQLite indexes (attribute children) in step with one TreeCRDT client.
 *
 * TreeCRDT delivers every change in order and remembers how far the indexes got, so a gap such as startup or a
 * failed update is caught up without rebuilding. A new INDEX_VERSION clears the indexes and reads every node.
 */
const createDerivedIndexes = async (client: TreecrdtClient) => {
  const subscription = await client.onMaterializedDurable(
    'em-derived-indexes',
    event => refreshAttributeChildrenFromChanges(client, event.changes),
    {
      version: INDEX_VERSION,
      reset: () => clearAttributeChildren(client),
      onError: err => console.error('TreeCRDT derived indexing failed', err),
    },
  )

  /** Resolves once every change materialized so far is indexed. A failed update is logged and retried, not thrown. */
  const indexed = () => subscription.settled().catch(err => console.error('TreeCRDT derived indexing failed', err))

  return { indexed, close: subscription.close }
}

export default createDerivedIndexes
