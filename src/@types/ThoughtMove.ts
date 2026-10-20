import ThoughtId from './ThoughtId'

/** Net position changes for diagnostics, including siblings shifted by an insert, move, or delete. */
interface ThoughtMove {
  readonly id: ThoughtId
  readonly value: string
  readonly oldRank: number | undefined
  readonly newRank: number | undefined
  readonly oldParentId: ThoughtId
  readonly newParentId: ThoughtId
}

export default ThoughtMove
