import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'

interface DocumentCommand<Payload, Result> {
  (): (state: State, transaction?: ThoughtspaceTransaction) => Result
  (payload: Payload): (state: State, transaction?: ThoughtspaceTransaction) => Result
  (state: State, payload: Payload, transaction?: ThoughtspaceTransaction): Result
  (state: State, transaction?: ThoughtspaceTransaction): Result
  requiresDocument: true
}

/** Curries document commands while forwarding their explicit transaction through composed commands. */
const command = <Payload, Result>(
  run: (state: State, payload: Payload, transaction?: ThoughtspaceTransaction) => Result,
): DocumentCommand<Payload, Result> => {
  /** Distinguishes an immediate state-first call from a payload-first composition. */
  const execute = (
    stateOrPayload?: State | Payload,
    payloadOrTransaction?: Payload | ThoughtspaceTransaction,
    transaction?: ThoughtspaceTransaction,
  ) => {
    if (stateOrPayload && typeof stateOrPayload === 'object' && 'thoughts' in stateOrPayload) {
      const isTransaction =
        payloadOrTransaction && typeof payloadOrTransaction === 'object' && 'afterPersist' in payloadOrTransaction
      return run(
        stateOrPayload as State,
        (isTransaction ? undefined : payloadOrTransaction) as Payload,
        isTransaction ? (payloadOrTransaction as ThoughtspaceTransaction) : transaction,
      )
    }
    return Object.assign(
      (state: State, transaction?: ThoughtspaceTransaction) => run(state, stateOrPayload as Payload, transaction),
      { requiresDocument: true as const },
    )
  }
  return Object.assign(execute, { requiresDocument: true as const }) as DocumentCommand<Payload, Result>
}

export default command
