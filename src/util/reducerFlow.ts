import State from '../@types/State'

type UnaryReducer<S> = (state: S) => Partial<S> | null

/**
 * Composes a list of reducers in order and merges the results.
 *
 * @param reducers      A list of unary reducers of type `oldState => newState`. Does not accept async reducers.
 * @param initialState
 */
const reducerFlow =
  <S = State>(reducers: (UnaryReducer<S> | null)[]) =>
  (initialState?: S) =>
    reducers.reduce((state, reducer) => {
      const stateNew = reducer?.(state) || state
      // return state reference as-is if unchanged
      // stateNew is allowed to be partial, so we need to merge it into state
      return stateNew === state
        ? state
        : {
            ...state,
            ...stateNew,
          }
    }, initialState as S)

export default reducerFlow
