import { State } from './initialState'

type UnaryReducer = (state: State) => State | null

/**
 * Composes a list of reducers in order and merges the results.
 *
 * @param reducers      A list of unary reducers of type `oldState => newState`. Does not accept async reducers.
 * @param initialState
 */
export const reducerFlow = (reducers: (UnaryReducer | null)[]) => (initialState: State) =>
  reducers.reduce((state, reducer) => ({
    ...state,
    ...reducer ? reducer(state) : null,
  }), initialState)
