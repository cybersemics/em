import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'

interface DocumentCommand<Payload, Result> {
  (): (state: State, document?: ThoughtspaceTransaction) => Result
  (payload: Payload): (state: State, document?: ThoughtspaceTransaction) => Result
  (state: State, payload: Payload, document?: ThoughtspaceTransaction): Result
  (state: State, document?: ThoughtspaceTransaction): Result
  requiresDocument: true
}

/** Curries document commands while forwarding their explicit transaction through composed commands. */
const command = <Payload, Result>(
  run: (state: State, payload: Payload, document?: ThoughtspaceTransaction) => Result,
): DocumentCommand<Payload, Result> => {
  /** Distinguishes an immediate state-first call from a payload-first composition. */
  const execute = (
    stateOrPayload?: State | Payload,
    payloadOrDocument?: Payload | ThoughtspaceTransaction,
    document?: ThoughtspaceTransaction,
  ) => {
    if (stateOrPayload && typeof stateOrPayload === 'object' && 'thoughts' in stateOrPayload) {
      const isDocument =
        payloadOrDocument && typeof payloadOrDocument === 'object' && 'afterPersist' in payloadOrDocument
      return run(
        stateOrPayload as State,
        (isDocument ? undefined : payloadOrDocument) as Payload,
        isDocument ? (payloadOrDocument as ThoughtspaceTransaction) : document,
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
