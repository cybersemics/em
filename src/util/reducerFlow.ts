import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'

type UnaryReducer<S> = ((state: S, transaction?: ThoughtspaceTransaction) => Partial<S> | null) & {
  requiresDocument?: boolean
}

/**
 * Composes a list of reducers in order and merges the results.
 *
 * @param reducers      A list of unary reducers of type `oldState => newState`. Does not accept async reducers.
 * @param initialState
 */
const reducerFlow = <S = State>(reducers: (UnaryReducer<NoInfer<S>> | null)[]) =>
  Object.assign(
    (initialState?: NoInfer<S>, transaction?: ThoughtspaceTransaction): NoInfer<S> =>
      reducers.reduce((state, reducer) => {
        // Lodash-curried UI reducers treat extra arguments as payload. Only explicit commands accept a transaction.
        const stateNew =
          (reducer && (reducer.requiresDocument || reducer.length >= 2)
            ? reducer(state, transaction)
            : reducer?.(state)) || state
        return stateNew === state
          ? state
          : {
              ...state,
              ...stateNew,
            }
      }, initialState as S),
    { requiresDocument: true as const },
  )

export default reducerFlow
