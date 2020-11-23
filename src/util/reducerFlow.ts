import { State } from './initialState'

type UnaryReducer<S> = (state: S) => S | null

/**
 * Composes a list of reducers in order and merges the results.
 *
 * @param reducers      A list of unary reducers of type `oldState => newState`. Does not accept async reducers.
 * @param initialState
 */
export const reducerFlow = <S = State>(reducers: (UnaryReducer<S> | null)[]) => (initialState?: S) =>
  reducers.reduce((state, reducer) => ({
    ...state,
    ...reducer ? reducer(state as any) : null,
  }), initialState as S)
