import PushBatch from '../@types/PushBatch'

/** Merges multiple push batches into a single batch. Last write wins. */
const mergeBatch = (accum: PushBatch, batch: Partial<PushBatch>): PushBatch => ({
  ...accum,
  // merge callbacks into a single callback function
  idbSynced:
    accum.idbSynced && batch.idbSynced
      ? () => {
          accum.idbSynced!()
          batch.idbSynced!()
        }
      : accum.idbSynced || batch.idbSynced,
  thoughtIndexUpdates: {
    ...accum.thoughtIndexUpdates,
    ...batch.thoughtIndexUpdates,
  },
  lexemeIndexUpdates: {
    ...accum.lexemeIndexUpdates,
    ...batch.lexemeIndexUpdates,
  },
  lexemeIndexUpdatesOld: {
    ...accum.lexemeIndexUpdatesOld,
    ...batch.lexemeIndexUpdatesOld,
  },
  recentlyEdited: {
    ...accum.recentlyEdited,
    ...batch.recentlyEdited,
  },
  pendingDeletes: [...(accum.pendingDeletes || []), ...(batch.pendingDeletes || [])],
  updates: {
    ...accum.updates,
    ...batch.updates,
  },
  local: batch.local !== false,
  remote: batch.remote !== false,
})

export default mergeBatch
